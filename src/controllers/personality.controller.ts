import personalityService from "@/services/personality.service";
import { Gender, Submission } from "@/types";
import testValidator from "@/validators/test.validator";
import { Request, Response } from "express";
import { z } from "zod";
import decode from "base64url";

const getQuestions = async (req: Request, res: Response) => {
  const questions = await personalityService.getPersonalityTest();
  res.json(questions);
};

const submit = async (
  req: Request<any, any, z.infer<typeof testValidator.submission>>,
  res: Response
) => {
  try {
    console.log("Incoming body:", JSON.stringify(req.body, null, 2));

    const { answers, gender } = req.body;

    const result = await personalityService.getTestResults(
      answers as Submission[],
      gender as Gender
    );

    res.json(result);
  } catch (error) {
    console.error("🔥 Error in /submit:", (error as Error).message);
    console.error("🔥 Stack trace:", (error as Error).stack);
    res.status(500).json({ message: "Internal server error" });
  }
};

export default {
  getQuestions,
  submit,
};
