const timer = require("./timer")

const coachSelectionHandler = (train,bookingDetails)=>
    new Promise(async(accept,reject)=>{
        try{
            const coaches = await train.$$('div.pre-avl');
            for(let coach of coaches){
                const strongText = await coach.$eval('strong', strong => strong.innerText);
                if (strongText.includes(bookingDetails.class)) {
                    //if user logs in before the tatkal booking starts (recommended) wait untill the bookings start
                    let errorOccured = false;
                    await timer(bookingDetails.quota,bookingDetails.class,bookingDetails.date).catch(err=>{
                        errorOccured = true;
                        reject(err)
                    })

                    if(errorOccured) return;

                    //when bookings started, click on class of seats needed
                    console.log("Clicked on "+ bookingDetails.class)
                    await coach.click("div.col-xs-12.link");
                    accept("coach selection successfull");
                    break;
                }
            }
        }
        catch(err){
            reject("Some error occured while selecting coach")
        }
    })

module.exports = coachSelectionHandler