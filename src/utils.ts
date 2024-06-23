import { join, parse } from "path";

export const removeFileExtension = (filePath: string): string => {
  const parsedPath = parse(filePath);

  const newName = parsedPath.name;
  const newPath = join(parsedPath.dir, newName);

  return newPath;
};
