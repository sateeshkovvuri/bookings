const timeDifference = require("./timeDifference")
const dateInIndia = require("./dateInIndia")

const setTimer = (quota,coachClass,journeyDate)=> 
    new Promise((accept,reject)=>{
        let bookingsStartTime = `${dateInIndia(0)}T11:00:00`;
        let differenceInMilliseconds
        if(quota == "TATKAL"){
            console.log(coachClass)
            if(coachClass == "AC 3 Tier (3A)"){
                bookingsStartTime = `${dateInIndia(0)}T10:00:00`;
            }
            differenceInMilliseconds = timeDifference(bookingsStartTime);
            if(differenceInMilliseconds>=0){
                accept()
            }
            else{
                let waitingTimeRemainder = setInterval(()=>{
                    differenceInMilliseconds+=1000
                    console.log(`waiting for ${-1*Math.ceil(differenceInMilliseconds/1000)} seconds`)
                },1000)
                setTimeout(()=>{
                    accept()
                    clearInterval(waitingTimeRemainder)
                },Math.abs(differenceInMilliseconds))
            }
        }
        else{
            //quota is GENERAL
            const differenceBetweenBookingTimeStartAndJourneyDate = 10339200000n
            let [day,month,year] = journeyDate.split("/")
            let differenceBetweenCurrentTimeAndJourneyDate = BigInt(timeDifference(`${year}-${month}-${day}T00:00:00`))
            const acceptedWaitingTime = BigInt(10*60*1000) //10 minutes accepted waiting time

            if(differenceBetweenCurrentTimeAndJourneyDate<=0){
                differenceBetweenCurrentTimeAndJourneyDate*=-1n
                let differenceInMilliseconds = differenceBetweenCurrentTimeAndJourneyDate-differenceBetweenBookingTimeStartAndJourneyDate
                if(differenceInMilliseconds<=0){
                    accept()
                }
                else if(differenceInMilliseconds<=acceptedWaitingTime){
                    differenceInMilliseconds = Number(differenceInMilliseconds)
                    let waitingTimeRemainder = setInterval(()=>{
                        differenceInMilliseconds-=1000
                        console.log(`waiting for ${Math.ceil(differenceInMilliseconds/1000)} seconds`)
                    },1000)
                    setTimeout(()=>{
                        accept()
                        clearInterval(waitingTimeRemainder)
                    },Math.abs(differenceInMilliseconds))
                }
                else{
                    reject("Very long waiting time (more than 10 minutes), cant proceed")
                }
            }
            else{
                accept()
            }
            
        }
    })

module.exports =  setTimer