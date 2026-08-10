let notifier = null;

export const registerGarageRequestNotifier = (io) => {
  notifier = (request) => {
    io.to(request.mechanicId).emit('garage_request_received', request);
  };
};

export const notifyIncomingGarageRequest = (request) => {
  if (!notifier) {
    return false;
  }

  notifier(request);
  return true;
};
