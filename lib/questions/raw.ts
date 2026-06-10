import type { Question } from "../types";

/** A question without its `notion` field — added by the aggregating index. */
export type RawQuestion = Omit<Question, "notion">;
