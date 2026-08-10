let io;

export const registerGarageRequestNotifier = (socketServer) => {
  io = socketServer;
};

export const notifyIncomingGarageRequest = (request) => {
  if (!io) {
    return false;
  }

  io.to(request.mechanicId).emit('garage_request_received', request);
  return true;
};

export const notifyGarageRequestUpdated = (request) => {
  if (!io) {
    return false;
  }

  io.to(request.requesterId).emit('garage_request_updated', request);
  return true;
};
