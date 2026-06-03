import type {
  AvailabilityMode,
  DayOfWeek,
  LegacyTimeSlot,
  TimeSlot,
} from "@/lib/types";

export type AvailabilityDigitalTimeSlot = Exclude<TimeSlot, LegacyTimeSlot>;
export type AvailabilityPeriodId = LegacyTimeSlot;

export type AvailabilityCellInput = {
  dayOfWeek: DayOfWeek;
  slot: TimeSlot;
  availabilityMode: AvailabilityMode;
};

export type NormalizedAvailabilityCell = {
  dayOfWeek: DayOfWeek;
  slot: AvailabilityDigitalTimeSlot;
  availabilityMode: AvailabilityMode;
};

type AvailabilityPeriodSlot = {
  slot: AvailabilityDigitalTimeSlot;
  label: string;
  start: string;
  end: string;
};

type AvailabilityPeriod = {
  id: AvailabilityPeriodId;
  label: string;
  summary: string;
  slots: AvailabilityPeriodSlot[];
};

const MORNING_SLOTS: AvailabilityPeriodSlot[] = [
  { slot: "MORNING_07_08", label: "07:00-08:00", start: "07:00", end: "08:00" },
  { slot: "MORNING_08_09", label: "08:00-09:00", start: "08:00", end: "09:00" },
  { slot: "MORNING_09_10", label: "09:00-10:00", start: "09:00", end: "10:00" },
  { slot: "MORNING_10_11", label: "10:00-11:00", start: "10:00", end: "11:00" },
  { slot: "MORNING_11_12", label: "11:00-12:00", start: "11:00", end: "12:00" },
];

const AFTERNOON_SLOTS: AvailabilityPeriodSlot[] = [
  { slot: "AFTERNOON_12_13", label: "12:00-13:00", start: "12:00", end: "13:00" },
  { slot: "AFTERNOON_13_14", label: "13:00-14:00", start: "13:00", end: "14:00" },
  { slot: "AFTERNOON_14_15", label: "14:00-15:00", start: "14:00", end: "15:00" },
  { slot: "AFTERNOON_15_16", label: "15:00-16:00", start: "15:00", end: "16:00" },
  { slot: "AFTERNOON_16_17", label: "16:00-17:00", start: "16:00", end: "17:00" },
  { slot: "AFTERNOON_17_18", label: "17:00-18:00", start: "17:00", end: "18:00" },
];

const EVENING_SLOTS: AvailabilityPeriodSlot[] = [
  { slot: "EVENING_18_19", label: "18:00-19:00", start: "18:00", end: "19:00" },
  { slot: "EVENING_19_20", label: "19:00-20:00", start: "19:00", end: "20:00" },
  { slot: "EVENING_20_21", label: "20:00-21:00", start: "20:00", end: "21:00" },
  { slot: "EVENING_21_22", label: "21:00-22:00", start: "21:00", end: "22:00" },
];

export const AVAILABILITY_TIME_GROUPS: AvailabilityPeriod[] = [
  {
    id: "MORNING",
    label: "Sáng",
    summary: "07:00-12:00",
    slots: MORNING_SLOTS,
  },
  {
    id: "AFTERNOON",
    label: "Chiều",
    summary: "12:00-18:00",
    slots: AFTERNOON_SLOTS,
  },
  {
    id: "EVENING",
    label: "Tối",
    summary: "18:00-22:00",
    slots: EVENING_SLOTS,
  },
];

export const AVAILABILITY_DIGITAL_TIME_SLOTS: AvailabilityDigitalTimeSlot[] =
  AVAILABILITY_TIME_GROUPS.flatMap((group) => group.slots.map((slotMeta) => slotMeta.slot));

const legacySlotExpansion: Record<LegacyTimeSlot, AvailabilityDigitalTimeSlot[]> = {
  MORNING: MORNING_SLOTS.map((slotMeta) => slotMeta.slot),
  AFTERNOON: AFTERNOON_SLOTS.map((slotMeta) => slotMeta.slot),
  EVENING: EVENING_SLOTS.map((slotMeta) => slotMeta.slot),
};

const digitalSlotSet = new Set<string>(AVAILABILITY_DIGITAL_TIME_SLOTS);

export const AVAILABILITY_DIGITAL_SLOT_META = AVAILABILITY_TIME_GROUPS.reduce<
  Record<AvailabilityDigitalTimeSlot, AvailabilityPeriodSlot & {
    groupId: AvailabilityPeriodId;
    groupLabel: string;
    groupSummary: string;
  }>
>((result, group) => {
  for (const slotMeta of group.slots) {
    result[slotMeta.slot] = {
      ...slotMeta,
      groupId: group.id,
      groupLabel: group.label,
      groupSummary: group.summary,
    };
  }

  return result;
}, {} as Record<AvailabilityDigitalTimeSlot, AvailabilityPeriodSlot & {
  groupId: AvailabilityPeriodId;
  groupLabel: string;
  groupSummary: string;
}>);

export function isLegacyTimeSlot(slot: TimeSlot): slot is LegacyTimeSlot {
  return slot === "MORNING" || slot === "AFTERNOON" || slot === "EVENING";
}

export function isAvailabilityDigitalTimeSlot(
  slot: TimeSlot,
): slot is AvailabilityDigitalTimeSlot {
  return digitalSlotSet.has(slot);
}

export function expandAvailabilityTimeSlot(
  slot: TimeSlot,
): AvailabilityDigitalTimeSlot[] {
  if (isLegacyTimeSlot(slot)) {
    return legacySlotExpansion[slot];
  }

  if (isAvailabilityDigitalTimeSlot(slot)) {
    return [slot];
  }

  return [];
}

export function normalizeAvailabilitySlots(
  entries: AvailabilityCellInput[],
): NormalizedAvailabilityCell[] {
  const normalized = new Map<string, NormalizedAvailabilityCell>();

  for (const entry of entries) {
    if (entry.availabilityMode === "BUSY") {
      continue;
    }

    for (const digitalSlot of expandAvailabilityTimeSlot(entry.slot)) {
      normalized.set(`${entry.dayOfWeek}_${digitalSlot}`, {
        dayOfWeek: entry.dayOfWeek,
        slot: digitalSlot,
        availabilityMode: entry.availabilityMode,
      });
    }
  }

  return [...normalized.values()];
}