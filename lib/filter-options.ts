export type SelectOption = {
  value: string;
  label: string;
};

export const PROPERTY_GROUP_OPTIONS: SelectOption[] = [
  { value: "", label: "Все типы" },
  { value: "WOHNHAEUSER", label: "Жилые дома" },
  { value: "WOHNUNGEN", label: "Квартиры" },
  { value: "GEWERBE", label: "Коммерция" },
  { value: "GRUNDSTUECKE", label: "Участки" },
  { value: "LAND_WALD", label: "Земля / лес" },
  { value: "GARAGEN", label: "Гаражи / парковки" },
  { value: "SONSTIGE", label: "Прочее" }
];

export const STATUS_OPTIONS: SelectOption[] = [
  { value: "", label: "Все статусы" },
  { value: "ACTIVE", label: "Активен" },
  { value: "CANCELLED", label: "Торги отменены" },
  { value: "ARCHIVED", label: "Архив" },
  { value: "SOLD", label: "Продан" },
  { value: "UNKNOWN", label: "Неизвестно" }
];

export const OCCUPANCY_OPTIONS: SelectOption[] = [
  { value: "", label: "Любое использование" },
  { value: "VACANT", label: "Свободен" },
  { value: "RENTED", label: "Сдан в аренду" },
  { value: "OWNER_OCCUPIED", label: "Используется собственником" },
  { value: "UNKNOWN", label: "Неизвестно" }
];

export const BOOLEAN_OPTIONS: SelectOption[] = [
  { value: "", label: "Не важно" },
  { value: "yes", label: "Да" },
  { value: "no", label: "Нет" }
];

export const WERTGRENZEN_OPTIONS: SelectOption[] = [
  { value: "", label: "Не важно" },
  { value: "yes", label: "Сняты" },
  { value: "no", label: "Не сняты / неизвестно" }
];

export const AUCTION_ATTEMPT_OPTIONS: SelectOption[] = [
  { value: "", label: "Любой термин" },
  { value: "1", label: "1-й термин" },
  { value: "2", label: "2-й термин" },
  { value: "3", label: "3-й и больше" }
];

export const SORT_OPTIONS: SelectOption[] = [
  { value: "auctionDateAsc", label: "Дата торгов: ближайшие" },
  { value: "auctionDateDesc", label: "Дата торгов: поздние" },
  { value: "priceAsc", label: "Цена: дешёвые" },
  { value: "priceDesc", label: "Цена: дорогие" },
  { value: "livingAreaDesc", label: "Wohnfläche: больше" },
  { value: "updatedDesc", label: "Недавно обновлённые" }
];

export function optionLabel(options: SelectOption[], value: string): string {
  return options.find((option) => option.value === value)?.label ?? value;
}
