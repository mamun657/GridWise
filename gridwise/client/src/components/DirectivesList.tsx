import { DirectivesGrid } from "./ui/DirectiveCard";
import type { DirectiveInterpretation } from "../types";

export function DirectivesList({ directives }: { directives: DirectiveInterpretation[] }) {
  return <DirectivesGrid directives={directives} />;
}
