export function questionnaireHubPath(questionnaireComplete: boolean) {
  return questionnaireComplete ? '/dating' : '/questions';
}
