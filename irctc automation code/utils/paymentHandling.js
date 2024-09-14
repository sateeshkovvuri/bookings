const paymentHandler = (page,bookingDetails)=>
    new Promise(async(accept,reject)=>{
        try{
            console.log("navigated to payments page, filling payments details")
            await page.waitForSelector("input#vpaCheck",{timeout:0,visible:true})
            await page.type("input#vpaCheck",bookingDetails.vpa)
            console.log("vpa typed")
            await page.waitForNetworkIdle({timeout:0})
            await page.waitForSelector("input#upi-sbmt.payment-btn.payActive[onClick='submitUpiForm()']",{timeout:0,visible:true})
            await page.click("input#upi-sbmt")
            console.log("clicked on pay")
            console.log("Waiting for you to accept the payment")
            await page.waitForNavigation({timeout:0})
            accept("exited from payment page")
        }
        catch(err){
            reject("Some error occured while handling payment")
        }
    })

module.exports = paymentHandler
