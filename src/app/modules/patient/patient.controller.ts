import { Request, Response } from "express";
import { PatientServices } from "./patient.service";
import { sendResponse } from "../../shared/sendResponse";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";

const updateMyProfile = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  const payload = req.body;
  const result = await PatientServices.updateMyProfile(user, payload);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "My profile Updated successfull",
    data: result,
  });
});

export const PatientController = {
  updateMyProfile,
};
