import mongoose from 'mongoose';
import { GarageRequest } from '../models/garageRequest.model.js';
import { User } from '../models/user.model.js';
import { publishGarageRequestCreated } from '../services/kafka.service.js';
import {
  notifyIncomingGarageRequest,
  notifyGarageRequestUpdated,
} from '../services/garageRequestNotification.service.js';
import { asyncHandler } from '../utils/AsyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';

const isValidLocation = (location) =>
  Array.isArray(location) &&
  location.length === 2 &&
  location.every((coordinate) => Number.isFinite(coordinate)) &&
  location[0] >= -180 &&
  location[0] <= 180 &&
  location[1] >= -90 &&
  location[1] <= 90;

const toNotification = ({ request, requester }) => ({
  requestId: request._id.toString(),
  mechanicId: request.mechanic.toString(),
  garageId: request.garage.toString(),
  garageName: request.garageName,
  description: request.description,
  location: request.location?.coordinates || null,
  status: request.status,
  createdAt: request.createdAt.toISOString(),
  requester: {
    id: requester._id.toString(),
    fullName: requester.fullName,
    username: requester.username,
    phone: requester.phone || null,
    avatar: requester.avatar,
  },
});

const toStatusNotification = ({ request, mechanic }) => ({
  requestId: request._id.toString(),
  requesterId: request.requester.toString(),
  mechanicId: request.mechanic.toString(),
  garageId: request.garage.toString(),
  garageName: request.garageName,
  description: request.description,
  status: request.status,
  estimatedArrivalMinutes: request.estimatedArrivalMinutes || null,
  respondedAt: request.respondedAt?.toISOString() || null,
  mechanic: {
    id: mechanic._id.toString(),
    fullName: mechanic.fullName,
    username: mechanic.username,
    phone: mechanic.phone || null,
    avatar: mechanic.avatar,
  },
});

export const createGarageRequest = asyncHandler(async (req, res) => {
  const { mechanicId, garageId } = req.params;
  const { description, location } = req.body;

  if (req.user.userType !== 'user') {
    throw new ApiError(403, 'Only users can send garage requests');
  }

  if (!mongoose.isValidObjectId(mechanicId) || !mongoose.isValidObjectId(garageId)) {
    throw new ApiError(400, 'Invalid mechanic or garage identifier');
  }

  if (typeof description !== 'string' || !description.trim()) {
    throw new ApiError(400, 'A request description is required');
  }

  if (description.trim().length > 1000) {
    throw new ApiError(400, 'Request description must be 1000 characters or fewer');
  }

  if (location !== undefined && !isValidLocation(location)) {
    throw new ApiError(400, 'Location must be [longitude, latitude]');
  }

  const mechanic = await User.findById(mechanicId).select('userType isAvailable garages');
  if (!mechanic || mechanic.userType !== 'mechanic') {
    throw new ApiError(404, 'Garage owner not found');
  }

  if (!mechanic.isAvailable) {
    throw new ApiError(409, 'This garage is not accepting requests right now');
  }

  const garage = mechanic.garages.id(garageId);
  if (!garage) {
    throw new ApiError(404, 'Garage not found');
  }

  const request = await GarageRequest.create({
    requester: req.user._id,
    mechanic: mechanic._id,
    garage: garage._id,
    garageName: garage.name,
    description: description.trim(),
    ...(location ? { location: { type: 'Point', coordinates: location } } : {}),
  });

  const notification = toNotification({ request, requester: req.user });
  const queued = await publishGarageRequestCreated(notification);

  // Running without Kafka remains usable for local development; a configured Kafka
  // broker is the normal delivery path and is consumed in backend/index.js.
  if (!queued) {
    notifyIncomingGarageRequest(notification);
  }

  return res.status(201).json(
    new ApiResponse(
      201,
      { request, delivery: queued ? 'kafka' : 'socket-fallback' },
      'Garage request sent successfully',
    ),
  );
});

export const getIncomingGarageRequests = asyncHandler(async (req, res) => {
  if (req.user.userType !== 'mechanic') {
    throw new ApiError(403, 'Only mechanics can view incoming garage requests');
  }

  const requestedLimit = Number.parseInt(req.query.limit, 10);
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(requestedLimit, 1), 100)
    : 25;

  const requests = await GarageRequest.find({ mechanic: req.user._id })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('requester', 'fullName username phone avatar');

  return res.status(200).json(
    new ApiResponse(200, requests, 'Incoming garage requests fetched successfully'),
  );
});

export const getMyGarageRequests = asyncHandler(async (req, res) => {
  if (req.user.userType !== 'user') {
    throw new ApiError(403, 'Only users can view their garage requests');
  }

  const requestedLimit = Number.parseInt(req.query.limit, 10);
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(requestedLimit, 1), 100)
    : 25;

  const requests = await GarageRequest.find({ requester: req.user._id })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('mechanic', 'fullName username phone avatar');

  return res.status(200).json(
    new ApiResponse(200, requests, 'Your garage requests fetched successfully'),
  );
});

export const updateGarageRequestStatus = asyncHandler(async (req, res) => {
  if (req.user.userType !== 'mechanic') {
    throw new ApiError(403, 'Only mechanics can update garage requests');
  }

  const { requestId } = req.params;
  const { status, estimatedArrivalMinutes } = req.body;
  const allowedStatuses = ['accepted', 'declined', 'completed'];

  if (!mongoose.isValidObjectId(requestId)) {
    throw new ApiError(400, 'Invalid garage request identifier');
  }

  if (!allowedStatuses.includes(status)) {
    throw new ApiError(400, 'Status must be accepted, declined, or completed');
  }

  const request = await GarageRequest.findOne({
    _id: requestId,
    mechanic: req.user._id,
  });
  if (!request) {
    throw new ApiError(404, 'Garage request not found');
  }

  if (request.status !== 'pending' && status !== 'completed') {
    throw new ApiError(409, 'This garage request has already been handled');
  }

  if (status === 'accepted') {
    const eta = Number(estimatedArrivalMinutes);
    if (!Number.isInteger(eta) || eta < 1 || eta > 1440) {
      throw new ApiError(400, 'Estimated arrival must be a whole number between 1 and 1440 minutes');
    }
    request.estimatedArrivalMinutes = eta;
  } else {
    request.estimatedArrivalMinutes = undefined;
  }

  request.status = status;
  request.respondedAt = new Date();
  await request.save();

  const notification = toStatusNotification({ request, mechanic: req.user });
  notifyGarageRequestUpdated(notification);

  return res.status(200).json(
    new ApiResponse(200, request, 'Garage request status updated successfully'),
  );
});
