import { BASE_URL, routes } from "@/config";
import {
  Gender,
  GetTestResultsPayload,
  Question,
  QuestionOption,
  SessionData,
  Submission,
  TestResult,
  TraitsResponse,
} from "@/types";
import { replaceMap } from "@/utils/replaceMap";
import session from "@/utils/session";
import { HttpError } from "@/utils/httpError";
import decode from "base64url";

const getSession = async (): Promise<SessionData> => {
  const res = await session.get(routes["api.session"]);
  return res.data;
};

const getTraits = async (): Promise<TraitsResponse> => {
  const res = await session.post(routes["api.profile.traits"], {});
  return res.data;
};

const getPersonalityTest = async (): Promise<Array<Question>> => {
  try {
    const res = await session.get(`${BASE_URL}/free-personality-test`);
    const regex = new RegExp(/:questions="(\[.*?\])"/, "gm");
    const matches = regex.exec(res.data);

    if (!matches) throw new Error("No matches found");

    const unparsedQuestions = matches[1];
    const replacedQuestions = Object.entries(replaceMap).reduce(
      (acc, [key, value]) => acc.replaceAll(key, value),
      unparsedQuestions
    );
    const questions = JSON.parse(replacedQuestions);

    const defaultOptions: QuestionOption[] = [
      { text: "Disagree strongly", value: -3 },
      { text: "Disagree moderately", value: -2 },
      { text: "Disagree a little", value: -1 },
      { text: "Neither agree nor disagree", value: 0 },
      { text: "Agree a little", value: 1 },
      { text: "Agree moderately", value: 2 },
      { text: "Agree strongly", value: 3 },
    ];

    return questions.map((question: any) => ({
      id: Buffer.from(unescape(encodeURIComponent(question.text))).toString(
        "base64url"
      ),
      text: question.text,
      options: defaultOptions,
    }));
  } catch (error) {
    console.error("Error in getPersonalityTest:", error);
    throw error;
  }
};

const getTestResults = async (
  submissionData: Submission[],
  gender: Gender
): Promise<TestResult> => {
  try {
    const questions = submissionData.map((s) => ({
      text: decode(s.id),
      answer: s.value,
    }));

    const payload = {
      extraData: [],
      gender,
      questions,
      teamInviteKey: "",
      inviteCode: "",
    };

    const res = await session.post<GetTestResultsPayload>(
      routes["test-results"],
      payload
    );

    console.log("✅ Got response from first POST:", res.data);

    const redirectUrl = res.data.redirect;
    const profileMatch = redirectUrl.match(/profiles\/(.+?)\/(m|f)/);
    const personalityType = profileMatch?.[1]?.toUpperCase() ?? "UNKNOWN";
    const variant = profileMatch?.[2] === "a" ? "Assertive" : "Turbulent";

    const traitsData = await getTraits();

    return {
      avatarAlt: "",
      avatarSrc: "",
      avatarSrcStatic: "",
      personality: personalityType,
      variant,
      niceName: personalityType,
      profileUrl: redirectUrl,
      traits: traitsData.traits,
      role: "",
      strategy: "",
    };
  } catch (err) {
    console.error("🔥 ERROR in getTestResults:", err);
    throw new HttpError(500, "Failed to get test results");
  }
};

export default {
  getPersonalityTest,
  getTestResults,
  getSession,
};
