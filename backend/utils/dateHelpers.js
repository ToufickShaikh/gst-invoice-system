// Date helper functions for GST returns and reports
const moment = require('moment');

/**
 * Parses period from request query parameters
 * @param {string} from - Start date in YYYY-MM-DD format
 * @param {string} to - End date in YYYY-MM-DD format
 * @returns {Object} Object containing start and end Date objects
 */
const parsePeriodDates = (from, to) => {
    if (!from || !to) {
        throw new Error('From and To dates are required');
    }
    const start = new Date(from);
    const end = new Date(to);
    end.setHours(23, 59, 59, 999); // Set end date to end of day
    return { start, end };
};

/**
 * Gets the financial year and month for a given date
 * @param {Date} date - Date object
 * @returns {Object} Object containing financial year and month details
 */
const getFinancialYearAndMonth = (date) => {
    const d = moment(date);
    const month = d.month() + 1; // moment months are 0-indexed
    const year = d.year();
    const fy = month > 3 ? year : year - 1;
    
    return {
        financialYear: `${fy}-${(fy + 1).toString().substr(-2)}`,
        month: month,
        monthName: d.format('MMMM'),
        quarter: Math.ceil(((month > 3 ? month : month + 12) - 3) / 3)
    };
};

/**
 * Formats a date as YYYY-MM-DD
 * @param {Date} date - Date object
 * @returns {string} Formatted date string
 */
const formatDateYYYYMMDD = (date) => {
    return moment(date).format('YYYY-MM-DD');
};

/**
 * Gets start and end dates for a given month and year
 * @param {number} month - Month (1-12)
 * @param {number} year - Year (YYYY)
 * @returns {Object} Object containing start and end dates
 */
const getMonthStartAndEnd = (month, year) => {
    const start = moment({ year, month: month - 1, day: 1 }).startOf('day');
    const end = moment(start).endOf('month').endOf('day');
    return {
        start: start.toDate(),
        end: end.toDate()
    };
};

/**
 * Gets quarter start and end dates
 * @param {number} quarter - Quarter (1-4)
 * @param {number} year - Year (YYYY)
 * @returns {Object} Object containing start and end dates
 */
const getQuarterStartAndEnd = (quarter, year) => {
    const startMonth = (quarter - 1) * 3 + 1;
    const start = moment({ year, month: startMonth - 1, day: 1 }).startOf('day');
    const end = moment(start).add(2, 'months').endOf('month').endOf('day');
    return {
        start: start.toDate(),
        end: end.toDate()
    };
};

/**
 * Gets financial year start and end dates
 * @param {string} fy - Financial year in format YYYY-YY
 * @returns {Object} Object containing start and end dates
 */
const getFinancialYearStartAndEnd = (fy) => {
    const [startYear] = fy.split('-');
    const start = moment({ year: parseInt(startYear), month: 3, day: 1 }).startOf('day');
    const end = moment(start).add(1, 'year').subtract(1, 'day').endOf('day');
    return {
        start: start.toDate(),
        end: end.toDate()
    };
};

module.exports = {
    parsePeriodDates,
    getFinancialYearAndMonth,
    formatDateYYYYMMDD,
    getMonthStartAndEnd,
    getQuarterStartAndEnd,
    getFinancialYearStartAndEnd
};
