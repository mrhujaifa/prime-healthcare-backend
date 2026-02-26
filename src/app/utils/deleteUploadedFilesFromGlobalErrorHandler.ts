/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request } from "express";
import { deleteFileFromCloudinary } from "../../config/cloudinary.config";

/*
 => Deletes any uploaded files from Cloudinary
 => if an error occurs during request processing.
 => This prevents orphan files when DB or other logic fails.
 */
export const deleteUploadedFilesFromGlobalErrorHandler = async (
  req: Request,
) => {
  try {
    // Store all uploaded file URLs that need to be deleted
    const filesToDelete: string[] = [];

    /**
     * Case 1: Single file upload (upload.single())
     * req.file structure: { path: "cloudinary-url" }
     */
    if (req.file?.path) {
      filesToDelete.push(req.file.path);
    } else if (
      /**
       * Case 2: Multiple fields upload (upload.fields())
       * req.files structure:
       * {
       *   image: [{ path: "url1" }],
       *   document: [{ path: "url2" }]
       * }
       */
      req.files &&
      typeof req.files === "object" &&
      !Array.isArray(req.files)
    ) {
      Object.values(req.files).forEach((fileArray) => {
        if (Array.isArray(fileArray)) {
          fileArray.forEach((file) => {
            if (file?.path) {
              filesToDelete.push(file.path);
            }
          });
        }
      });
    } else if (Array.isArray(req.files) && req.files.length > 0) {
      /**
       * Case 3: Multiple files upload (upload.array())
       * req.files structure:
       * [{ path: "url1" }, { path: "url2" }]
       */
      req.files.forEach((file) => {
        if (file?.path) {
          filesToDelete.push(file.path);
        }
      });
    }

    // If there are files to delete, remove them in parallel
    if (filesToDelete.length > 0) {
      await Promise.all(
        filesToDelete.map((url) => deleteFileFromCloudinary(url)),
      );

      console.log(
        `Deleted ${filesToDelete.length} uploaded file(s) from Cloudinary due to request failure.`,
      );
    }
  } catch (error: any) {
    // Log deletion failure but do not crash the server
    console.error(
      "Failed to delete uploaded files from Global Error Handler:",
      error,
    );
  }
};
