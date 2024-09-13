const paymentHandler = (page,bookingDetails,ws,clientInputEvent)=>
    new Promise(async(accept,reject)=>{
        try{
            console.log("navigated to payments page, filling payments details")
            if(bookingDetails.paymentMode == "upi"){
                await page.waitForSelector("input#vpaCheck",{timeout:0,visible:true})
                await page.type("input#vpaCheck",bookingDetails.vpa)
                console.log("vpa typed")
                await page.waitForNetworkIdle({timeout:0})
                await page.waitForSelector("input#upi-sbmt",{timeout:0,visible:true})
                await page.click("input#upi-sbmt")
                console.log("clicked on pay")
                console.log("Waiting for you to accept the payment")
                await page.waitForNavigation({timeout:0})
                accept("exited from payment page")
            }
            else{
                let cardTypeSelector = "li#debitLi"
                if(bookingDetails.paymentMode == "credit"){
                    cardTypeSelector = "li#creditLi"
                }
                await page.waitForSelector(cardTypeSelector,{timeout:0,visible:true})
                await page.click(cardTypeSelector)
                await page.waitForSelector("input.userCardNumber",{timeout:0,visible:true})
                await page.type("input.userCardNumber",bookingDetails.cardDetails.cardNo)
                await page.waitForSelector("input#paymentDate",{timeout:0,visible:true})
                await page.type("input#paymentDate",bookingDetails.cardDetails.expiry)
                await page.waitForSelector("input#cvvNumber",{timeout:0,visible:true})
                await page.type("input#cvvNumber",bookingDetails.cardDetails.cvv)
                await page.waitForSelector("input#cardName",{timeout:0,visible:true})
                await page.type("input#cardName",bookingDetails.cardDetails.name)
                await page.waitForNetworkIdle({timeout:0})
                await page.waitForSelector("input#confirm-purchase.payment-btn.actvBtnCreditDebit",{timeout:0,visible:true})
                await page.click("input#confirm-purchase.payment-btn.actvBtnCreditDebit")
                console.log("clicked on pay")
                await page.waitForNavigation({timeout:0})
                await page.waitForSelector("input[type='password']",{timeout:0,visible:true})
                ws.send(JSON.stringify({"otp":""}))
                console.log("Waiting for OTP")
                clientInputEvent.once("solved-otp",async(otp)=>{
                    await page.type("input[type='password']",otp)
                    await page.waitForSelector("button#submitBtn",{timeout:0,visible:true})
                    //await page.click("button#submitBtn")
                    await page.waitForNavigation({timeout:0})
                    accept("exited from payment page")
                })
            }
        }
        catch(err){
            reject("Some error occured while handling payment")
        }
    })

module.exports = paymentHandler