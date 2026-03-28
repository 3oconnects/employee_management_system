import { Request, Response } from "express";
import { updateUserProfile } from "../services/userService";

export const updateProfile = async (req: Request, res: Response) => {

  try {

    const { id, name, email, phone, address, emergency } = req.body;

    const user = await updateUserProfile(
      id,
      name,
      email,
      phone,
      address,
      emergency
    );

    res.json({
      message: "Profile updated successfully",
      user
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Failed to update profile"
    });

  }

};
