const { timeout } = require("puppeteer-core");
const dateInIndia = require("./dateInIndia")
const moment = require('moment-timezone');

const calculateTimeDifferenceInMilliseconds = (page,startTime) => {
    return  new Promise(async(accept,reject)=>{
        try{
            let IRCTCTime = await new Promise(async(accept,reject)=>{
                try{
                    const clockSelector = 'a+span>strong'
                    await page.waitForSelector(clockSelector,{timeout:0,visible:true})
                    console.log("Waiting for 10 seconds for IRCTC time to be stable")
                    setTimeout(async()=>{
                        const clock = await page.$(clockSelector)
                        const time = await clock.evaluate(e=>e.innerHTML)
                        const match = time.match(/\[([^\]]+)\]/);
                        const extractedText = match[1]; // The text inside the brackets
                        accept(extractedText);
                    },10000)
                }
                catch(err){
                    reject()
                }
            })
            IRCTCTime = `${dateInIndia(0)}T${IRCTCTime}`
            console.log(`IRCTC Time : ${IRCTCTime}`)
            const IRCTCMoment = moment.tz(IRCTCTime, 'Asia/Kolkata');
            const startMoment = moment.tz(startTime, 'Asia/Kolkata');
            const diffMilliseconds = IRCTCMoment.diff(startMoment);
            accept(diffMilliseconds);
        }
        catch{
            reject("Some error occured while capturing time from IRCTC")
        }
    })
}

module.exports = calculateTimeDifferenceInMilliseconds