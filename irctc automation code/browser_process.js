const puppeteer = require('puppeteer');
const WebSocket = require('ws');
const EventEmitter = require('events');
const clientInputEvent = new EventEmitter();
const dateInIndia = require("./utils/dateInIndia")
const loginHandler = require("./utils/loginHandling")
const coachSelectionHandler = require("./utils/coachSelectionHandling")
const seatsAvailabilityHandler = require("./utils/seatsAvailabilityHandling")
const slotsCreationHandler = require("./utils/slotsCreationHandling")
const paymentsHandler = require("./utils/paymentHandling")


const wss = new WebSocket.Server({ port: 3003 });

wss.on('connection', (ws) => {
    console.log('Client connected');
    (async () => {
        console.log("Browser will be launched")
        const browser = await puppeteer.launch({
            headless: false,
            args: [
                '--disable-notifications','--no-sandbox'
            ]
        });
        
        //fetch details from database
        let bookingDetails = {
            paymentMode:"debit",//debit credit upi
            cardDetails:{
                cardNo:"4594530111728952",
                expiry:"02/26",
                cvv:"703",
                name:"kovvuri sateesh reddy"
            },
            /*paymentMode:"credit",//debit credit upi
            cardDetails:{
                cardNo:"5172528154020888",
                expiry:"03/25",
                cvv:"999",
                name:"K V R KRISHNA REDDY"
            },*/
            credentials:["Sateeshkovvuri","Ic25#52cI"],
            src:"LINGAMPALLI - LPI (SECUNDERABAD)",
            dest:"DWARAPUDI - DWP ",
            quota:"GENERAL",
            //class:"AC 3 Tier (3A)",
            class:"Sleeper (SL)",
            //date:"11/01/2025",
            date:"27/11/2024",
            trainNo:12738,
            passengers:[{
                name:"k sateesh reddy",
                age:"21",
                gender:"M",
                berth:"UB"
            },
            /*{
                name:"k krishna reddy",
                age:"42",
                gender:"M",
                berth:"MB"
            },
            {
                name:"k sandeep reddy",
                age:"17",
                gender:"M",
                berth:"MB"
            },*/
            {
                name:"k sandhya reddy",
                age:"38",
                gender:"F",
                berth:"LB"
            }
        ],
        //vpa:"8686553696@yesg",
        vpa:"9989756355@icici"
        }

        //if user is booking a ticket in TATKAL quota change date of booking to tommorow's date
        if(bookingDetails.quota == "TATKAL"){
            bookingDetails.date = dateInIndia(1)
        }

        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        //page.setDefaultNavigationTimeout(0);
        await page.goto('https://www.irctc.co.in/nget/train-search', { timeout: 0,waitUntil:'domcontentloaded' }); //navigating to irctc site
    
        await page.click("a.search_btn.loginText.ng-star-inserted")
        const credentials = bookingDetails.credentials

        //retrieve captcha at login
        const imageSrc = await getCaptcha(page) 
        //when login captcha is available, send it to the user
        ws.send(JSON.stringify({"login-captcha":imageSrc}))

        //when captcha is recieved from the user,fill {login credentials,captcha} and click on the login 
        clientInputEvent.once("solved-login-captcha",async(captcha)=>{

            //attempt to login:
            let loginStatus = await loginHandler(page,credentials,captcha).catch(err=>{
                console.log(err)
            });
            console.log(loginStatus)

            //fill journey details:
            const texts = [bookingDetails.src, bookingDetails.dest,bookingDetails.date];
    
            let journeyDetailsFillingStatus = await fillJourneyDetails(page,texts,bookingDetails.quota).catch(err=>{
                console.log(err)
            })
            console.log(journeyDetailsFillingStatus)

            //click on search:
            await page.waitForSelector('button.search_btn.train_Search',{timeout:0,visible:true})
            await page.click('button.search_btn.train_Search')

            //wait untill we are navigated to 'available trains page'
            await page.waitForNavigation({timeout:0,waitUntil:'domcontentloaded'})

            //get all the train user requested for
            let train = await selectTrain(page,bookingDetails.trainNo)
            //if there are no trains available for provided details. This might also occur when navigation fails.
            if(train == null){
                console.log("Train not found/Seems like navigation has failed")
            }
            else{
                //from the selected train select the coach/class that user selected for 'at appropriate time'
                const coachSelectionStatus = await coachSelectionHandler(train,bookingDetails).catch(err=>{
                    console.log(err)
                });
                console.log(coachSelectionStatus)

                //get how many seats are available
                await page.waitForSelector(`p-tabmenu ~ div.ng-star-inserted`,{timeout:0})
                const seats = await page.$(`p-tabmenu ~ div.ng-star-inserted td>div.pre-avl`)
                const availability = await seatsAvailabilityHandler(page,seats).catch(err=>{
                    console.log(err)
                })
                console.log(availability)

                //click on seats if available
                if(availability.indexOf("AVAILABLE")!=-1){
                    //proceed
                    await seats.click() 
                    await page.click("button.btnDefault.train_Search.ng-star-inserted:not(.disable-book)")
                    await page.waitForNavigation({timeout:0,waitUntil:'domcontentloaded'})
                    
                    const passengers = bookingDetails.passengers
                    const totalPassengers = passengers.length
                    //create slots to fill passenger details
                    let slotsCreationStatus = await slotsCreationHandler(page,totalPassengers).catch(err=>{
                        console.log(err)
                    })
                    console.log(slotsCreationStatus)

                    //fill passenger details
                    
                    let fillingPassengersDetailsStatus = await fillPassangerDetails(page,passengers).catch(err=>{
                        console.log(err)
                    });
                    console.log(fillingPassengersDetailsStatus)

                    //choosing auto upgradation
                    await page.waitForSelector('label[for="autoUpgradation"]',{timeout:0})
                    await page.click('label[for="autoUpgradation"]')

                    //selecting upi payment method, if user has oconfigured to,other wise user will be paying using debit/credit card
                    if(bookingDetails.paymentMode == "upi"){
                        await page.waitForSelector(`p-radiobutton[name="paymentType"][id="2"] span.ui-radiobutton-icon.ui-clickable`,{timeout:0})
                        await page.click(`p-radiobutton[name="paymentType"][id="2"] span.ui-radiobutton-icon.ui-clickable`)
                    }
                    
                    //submit filled details and wait for navigation
                    await(await page.$("button[type='submit']")).click()
                    await page.waitForNavigation({timeout:0,waitUntil:"domcontentloaded"})


                    //get how many seats are still available before we go for payment
                    const availabilityAtPayment = await(await page.$("app-train-header div+div>div+div>span>span.pull-right")).evaluate(e=>e.innerText)
                    console.log("availability at payment:",availabilityAtPayment)

                    //retrieve captcha at passenger details confirmation
                    const imageSrc = await getCaptcha(page)
                    //when captcha is available send it to the user
                    ws.send(JSON.stringify({"details-confirmation-captcha":imageSrc}))
                    
                    //when user has send the captcha text
                    clientInputEvent.once("solved-details-confirmation-captcha",async(captcha)=>{
                        //submit the captcha and wait untill we are navigated to payment
                        await page.waitForSelector("input#captcha",{timeout:0});
                        await page.type("input#captcha",captcha)
                        await page.waitForSelector("button.train_Search",{timeout:0})
                        await page.click("button.train_Search")
                        await page.waitForNavigation({timeout:0})
                        await page.waitForSelector("button+button",{timeout:0})
                        await page.click("button+button")
                        await page.waitForNavigation({timeout:0})


                        //perform payment
                        /*let paymentStatus = await paymentsHandler(page,bookingDetails,ws,clientInputEvent).catch(err=>{
                            console.log(err)
                        })
                        console.log(paymentStatus)*/
                    })

                }
            }

        })
        
        // await browser.close();
    })();

    ws.on('message', async(message) => {
        let clientInput = JSON.parse(message.toString());
        let requirement = Object.keys(clientInput)[0]
        if(requirement == "solved-login-captcha"){
            clientInputEvent.emit("solved-login-captcha",clientInput[requirement])
        }
        else if(requirement == "solved-details-confirmation-captcha"){
            clientInputEvent.emit("solved-details-confirmation-captcha",clientInput[requirement])
        }
        else if(requirement == "solved-otp"){
            clientInputEvent.emit("solved-otp",clientInput[requirement])
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });

});

console.log('WebSocket server listening on port 3003');

async function fillPassangerDetails(page,passengers){
    try{
        console.log("Filling passenger details")
        const passengerNameSelector = `input[placeholder="Passenger Name"]`
        const passengerAgeSelector = `input[formcontrolname="passengerAge"]`
        const passengerGenderSelector = `select[formcontrolname="passengerGender"]`
        const passengerBerthChoiceSelector = `select[formcontrolname="passengerBerthChoice"]`
        const passengerNames = await page.$$(passengerNameSelector)
        const passengerAges = await page.$$(passengerAgeSelector)
        const passengerGenders = await page.$$(passengerGenderSelector)
        const passengerBerthChoices = await page.$$(passengerBerthChoiceSelector)
        console.log(passengerAges.length,passengerNames.length,passengerGenders.length,passengerBerthChoices.length)
    
        return new Promise(async(accept,reject)=>{
            for(let passengerNo in passengers){
                console.log("passenger: "+passengerNo)
                const passengerGender = passengers[passengerNo].gender
                await passengerGenders[passengerNo].select(passengerGender)
        
                const passengerBerthChoice = passengers[passengerNo].berth
                await passengerBerthChoices[passengerNo].select(passengerBerthChoice)
        
                const passengerAge = passengers[passengerNo].age
                await page.evaluate((element, text) => {
                    element.value = text;
                    element.dispatchEvent(new Event('input', { bubbles: true }));
                }, passengerAges[passengerNo], passengerAge);
        
                const passengerName = passengers[passengerNo].name
                await page.evaluate((element, text) => {
                    element.value = text;
                    element.dispatchEvent(new Event('input', { bubbles: true }));
                }, passengerNames[passengerNo], passengerName);
    
                if(passengerNo == passengers.length-1){
                    accept("passesngers details filled successfully")
                }
            }
        })
    }
    catch(err){
        reject("Some error occured while filling passengers details")
    }
    
}

async function fillJourneyDetails(page,texts,bookingQuota){

    const bookingQuotaDropdown = `span.ui-dropdown-trigger-icon.ui-clickable.ng-tns-c65-12.pi.pi-chevron-down`
    const bookingQuotaOption = `li[aria-label="${bookingQuota}"]`
    await page.waitForSelector(bookingQuotaDropdown,{timeout:0})
    await page.click(bookingQuotaDropdown)
    await page.waitForSelector(bookingQuotaOption,{timeout:0})
    await page.click(bookingQuotaOption)
    const inputs = await page.$$('span > input');

    return new Promise(async(accept,reject)=>{
        try{
            for (let i = 0; i < 3; i++) {
                if(i==2 && inputs[2]){
                    await page.evaluate(el => el.value = "", inputs[2]);
                    await inputs[2].type(texts[2]);
                    await page.click("a.ui-state-default.ng-tns-c58-10.ui-state-active.ng-star-inserted")

                    accept("Journey details filled successfully")
                }
                else if(inputs[i]){
                    await inputs[i].type(texts[i]);
                }
            }
        }
        catch{
            reject("Some error occured while filling data")
        }
    })
}

function getCaptcha(page){
    return new Promise(async (accept,reject)=>{
        const imageSelector = 'img.captcha-img'; // Replace with your actual image selector
    
        // Wait for the image element to appear
        await page.waitForSelector(imageSelector);
        // Get the src attribute of the image
        const imageSrc = await page.evaluate((selector) => {
            const img = document.querySelector(selector);
            return img ? img.src : null;
        }, imageSelector);

        accept(imageSrc)
    })
}

async function selectTrain(page,trainNumber){
    const trains = await page.$$('div.form-group.no-pad.col-xs-12.bull-back.border-all');
    for(let train of trains){
        await train.waitForSelector('strong', { timeout: 0 });
        const strongText = await train.$eval('strong', strong => strong.innerText);
        if (strongText.includes(`(${trainNumber})`)) {
            return train
        }
    }
    return null
}