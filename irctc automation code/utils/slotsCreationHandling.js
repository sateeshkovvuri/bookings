const slotsCreationHandler = async(page,totalPassengers)=>{
    return new Promise(async(accept,reject)=>{
        try{
            await page.waitForSelector("div>a:has(span+span)") //this element consists an event which adds a new slot when ever we clicked 'Add new passenger'
            const addPassenger = await page.$("span.prenext",{visible:true,timeout:0})
            for(let p=1;p<totalPassengers;p++){
                await addPassenger.click();
                await page.waitForFunction((sel, count) => {
                    return document.querySelectorAll(sel).length >= count;
                }, {}, "app-passenger", p+1);
                if(p == totalPassengers-1){
                    accept("slots created for filling passenger details")
                }
            }
        }

        catch(err){
            console.log(err)
            reject("Some error occured while creating slots to fill passenger details")
        }
    })
}

module.exports = slotsCreationHandler