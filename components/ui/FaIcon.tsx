"use client";

import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

type Props = {
  icon: IconDefinition;
  className?: string;
  fixedWidth?: boolean;
};

export function FaIcon({ icon, className, fixedWidth }: Props) {
  return <FontAwesomeIcon icon={icon} className={className} fixedWidth={fixedWidth} />;
}
