const seatsAvailabilityHandler = (page,seats)=>
    new Promise(async(accept,reject)=>{
        try{
            const seatsInfo = await seats.$$("strong")
            const availability = await seatsInfo[1].evaluate(e=>e.innerText)
            accept(availability)
        }
        catch(err){
            console.log(err)
            reject("Some error occured while checking availability of seats")
        }
    })

module.exports = seatsAvailabilityHandler