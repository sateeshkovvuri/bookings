const calculateTimeDifferenceInMilliseconds = (timeToCompare) => {
    const moment = require('moment-timezone');
    const getIndiaTime = () => moment.tz('Asia/Kolkata');
    const indiaTime = getIndiaTime();
    const givenMoment = moment.tz(timeToCompare, 'Asia/Kolkata');
    const diffMilliseconds = indiaTime.diff(givenMoment);
    return diffMilliseconds;
}

module.exports = calculateTimeDifferenceInMilliseconds