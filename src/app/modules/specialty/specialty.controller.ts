import { Request, Response } from "express";
import { SpecialtyService } from "./specialty.service";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";

//* Create Specialty
const createSpecialty = catchAsync(async (req: Request, res: Response) => {
  // const payload = req.body;

  const payload = {
    ...req.body, // data
    icon: req.file?.path, // image upload path name like img url
  };
  const result = await SpecialtyService.createSpecialty(payload);
  sendResponse(res, {
    httpStatusCode: 200,
    success: true,
    message: "Specialty created successfully",
    data: result,
  });
});

//* Get all Specialty data
const getAllSpecialties = catchAsync(async (req: Request, res: Response) => {
  const specialties = await SpecialtyService.getAllSpecialties();
  sendResponse(res, {
    httpStatusCode: 200,
    success: true,
    message: "Specialties fetched successfully",
    data: specialties,
  });
});

//* Delete Specialty by id
const deleteSpecialty = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({
      success: false,
      message: "Id is required",
    });
  }
  const deleteSpecialty = await SpecialtyService.deleteSpecialty(id as string);
  sendResponse(res, {
    httpStatusCode: 200,
    success: true,
    message: "Specialty deleted successfully",
    data: deleteSpecialty,
  });
});

export const SpecialtyController = {
  createSpecialty,
  getAllSpecialties,
  deleteSpecialty,
};
