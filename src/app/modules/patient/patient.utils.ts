import { isValid, parse } from "date-fns";

export const convertToDateTime = (dateString: string | undefined) => {
  if (!dateString) return undefined;

  const date = parse(dateString, "yyyy/MM/dd", new Date());

  const dateValidation = isValid(date);

  if (!dateValidation) return undefined;

  return date;
};
