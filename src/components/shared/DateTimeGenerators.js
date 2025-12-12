/**
 * Date/Time Generators - Shared utility functions for date/time pickers
 */

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const generateDays = () => Array.from({ length: 31 }, (_, i) => i + 1);
export const generateMonths = () => MONTHS;
export const generateYears = () => Array.from({ length: 21 }, (_, i) => 2015 + i);
export const generateHours = () => Array.from({ length: 12 }, (_, i) => i + 1);
export const generateMinutes = () => Array.from({ length: 60 }, (_, i) => i);
export const generateAmPm = () => ['AM', 'PM'];
