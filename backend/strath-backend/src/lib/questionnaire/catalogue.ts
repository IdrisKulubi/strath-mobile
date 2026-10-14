import rawCatalogue from "./catalogue.json";
import { NEUTRAL_ANSWER_IDS, REQUIRED_ANSWER_COUNT, REQUIRED_QUESTION_IDS } from "./contracts";

export type QuestionOption = { id: string; label: string };
export type CatalogueQuestion = {
    id: string;
    categoryId: string;
    prompt: string;
    options: QuestionOption[];
    position: number;
    sensitive: boolean;
    published: boolean;
};

export const catalogue = rawCatalogue as CatalogueQuestion[];

export function questionIdentity(id: string) {
    const match = /^(q\d{3}):(\d+)$/.exec(id);
    if (!match) throw new Error(`Invalid versioned question id: ${id}`);
    return { questionKey: match[1], version: Number(match[2]) };
}

export function questionPool(question: CatalogueQuestion) {
    if (question.sensitive) return "sensitive" as const;
    return question.position < 40 ? "starter" as const : "replacement" as const;
}

export function validateCatalogue() {
    if (catalogue.length !== 109) throw new Error(`Expected 109 questions, found ${catalogue.length}`);
    const ids = new Set<string>();
    const positions = new Set<number>();
    for (const question of catalogue) {
        questionIdentity(question.id);
        if (ids.has(question.id)) throw new Error(`Duplicate question id: ${question.id}`);
        if (positions.has(question.position)) throw new Error(`Duplicate question position: ${question.position}`);
        if (question.options.length < 2) throw new Error(`Question ${question.id} needs at least two options`);
        if (new Set(question.options.map((option) => option.id)).size !== question.options.length) {
            throw new Error(`Question ${question.id} has duplicate option ids`);
        }
        ids.add(question.id);
        positions.add(question.position);
    }
    if (REQUIRED_QUESTION_IDS.length !== REQUIRED_ANSWER_COUNT || new Set(REQUIRED_QUESTION_IDS).size !== REQUIRED_ANSWER_COUNT) {
        throw new Error("Required question IDs must be unique and match the completion target");
    }
    for (const id of REQUIRED_QUESTION_IDS) {
        const question = catalogue.find((item) => item.id === id);
        if (!question?.published) throw new Error(`Required question is missing or unpublished: ${id}`);
    }
    for (const [id, optionId] of Object.entries(NEUTRAL_ANSWER_IDS)) {
        const question = catalogue.find((item) => item.id === id);
        if (!question?.options.some((option) => option.id === optionId)) {
            throw new Error(`Neutral answer option is missing: ${id}/${optionId}`);
        }
    }
}
