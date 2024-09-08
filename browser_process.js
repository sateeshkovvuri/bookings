const puppeteer = require('puppeteer');
const WebSocket = require('ws');
const EventEmitter = require('events');
const clientInputEvent = new EventEmitter();


const wss = new WebSocket.Server({ port: 3002 });

wss.on('connection', (ws) => {
    console.log('Client connected');
    (async () => {
        console.log("Browser will be launched")
        const browser = await puppeteer.launch({
            headless: true,
            args: [
                '--disable-notifications','--no-sandbox', '--disable-setuid-sandbox'
            ]
        });
        
        let bookingDetails = {
            paymentMode:"debit",
            cardDetails:{
                cardNo:"4594530111728952",
                expiry:"02/26",
                cvv:"703",
                name:"kovvuri sateesh reddy"
            },
            credentials:["Sateeshkovvuri","Ic25#52cI"],
            src:"LINGAMPALLI - LPI (SECUNDERABAD)",
            dest:"DWARAPUDI - DWP ",
            quota:"GENERAL",
            //class:"AC 3 Tier (3A)",
            class:"Sleeper (SL)",
            date:"27/11/2024",
            trainNo:12738,
            passengers:[{
                name:"k sateesh reddy",
                age:"21",
                gender:"M",
                berth:"UB"
            },
            {
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
            },
            {
                name:"k sandhya reddy",
                age:"38",
                gender:"F",
                berth:"LB"
            }
        ],
        vpa:"8686553696@yesg",
        }

        if(bookingDetails.quota == "TATKAL"){
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);
            
            const options = {
              timeZone: 'Asia/Kolkata', // India's time zone
              year: 'numeric',
              month: '2-digit',
              day: '2-digit'
            };
            
            const formatter = new Intl.DateTimeFormat('en-IN', options);
            bookingDetails.date = formatter.format(tomorrow)
            console.log(bookingDetails.date)
        }

        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        page.setDefaultNavigationTimeout(0);
        console.log("navigating to site")
        await page.goto('https://www.irctc.co.in/nget/train-search', { timeout: 0,waitUntil:'domcontentloaded' });
        console.log("navigation successfull")
    
        await page.click("a.search_btn.loginText.ng-star-inserted")
        const credentials = bookingDetails.credentials
        const imageSrc = await getCaptcha(page)
        ws.send(JSON.stringify({"login-captcha":imageSrc}))
        clientInputEvent.once("solved-login-captcha",async(captcha)=>{
            let usernameSelector = `input[placeholder="User Name"]`
            let passwordSelector = `input[placeholder="Password"]`
            await page.waitForSelector(usernameSelector,{timeout:0});
            await page.type(usernameSelector,credentials[0])
            await page.waitForSelector(passwordSelector,{timeout:0});
            await page.type(passwordSelector,credentials[1])
            await page.type("input#captcha",captcha)
            await page.click(`span > button.search_btn.train_Search[type="submit"]`)

            await page.waitForSelector(`a[routerlink="/logout"]`)
    

            const texts = [bookingDetails.src, bookingDetails.dest,bookingDetails.date];//
    
            fillJourneyDetails(page,texts,bookingDetails.quota).then(async()=>{
                await page.waitForSelector('button.search_btn.train_Search',{timeout:0,visible:true})
                await page.click('button.search_btn.train_Search')
                console.log("Search clicked")
                await page.waitForNavigation({timeout:0,waitUntil:'domcontentloaded'})
                let train = await selectTrain(page,bookingDetails.trainNo)
                if(train == null){
                    console.log("Train not found")
                }
                else{
                    await new Promise(async(accept,reject)=>{
                        const coaches = await train.$$('div.pre-avl');
                        for(let coach of coaches){
                            const strongText = await coach.$eval('strong', strong => strong.innerText);
                            if (strongText.includes(bookingDetails.class)) {
                                await new Promise((accept,reject)=>{
                                    if(bookingDetails.quota == "TATKAL"){
                                        console.log(bookingDetails.class)
                                        let givenTime = "2024-09-08T11:00:00";
                                        if(bookingDetails.class == "AC 3 Tier (3A)"){
                                            givenTime = "2024-09-08T10:00:00";
                                        }
                                        console.log(givenTime)
                                        let differenceInMilliseconds = calculateTimeDifferenceInMilliseconds(givenTime);
                                        console.log(differenceInMilliseconds)
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
                                        accept()
                                    }
                                })
                                console.log("Clicked on "+ bookingDetails.class)
                                await coach.click("div.col-xs-12.link");
                                accept();
                                break;
                            }
                        }
                    })
                    await page.waitForSelector(`p-tabmenu ~ div.ng-star-inserted`,{timeout:0})
                    const seats = await page.$(`p-tabmenu ~ div.ng-star-inserted td>div.pre-avl`)
                    const seatsInfo = await seats.$$("strong")
                    const availability = await seatsInfo[1].evaluate(e=>e.innerText)
                    console.log(availability)
                    if(availability.indexOf("AVAILABLE")!=-1){
                        await seats.click() 
                        await page.click("button.btnDefault.train_Search.ng-star-inserted:not(.disable-book)")
                        await page.waitForNavigation({timeout:0,waitUntil:'domcontentloaded'})
                        
                        const passengers = bookingDetails.passengers
                        const addPassenger = await page.$("span.prenext",{timeout:0,visible:true})
                        const totalPassengers = passengers.length
                        console.log("Total passengers: ",totalPassengers)
                        await new Promise(async(accept,reject)=>{
                            for(let p=1;p<totalPassengers;p++){
                                await addPassenger.click();
                                await page.waitForFunction((sel, count) => {
                                    return document.querySelectorAll(sel).length >= count;
                                }, {}, "a.fa.fa-remove.fa-lg.ng-star-inserted", p+1);
                                if(p == passengers.length-1){
                                    accept()
                                    console.log("slots created")
                                }
                            }
                        })

                        await fillPassangerDetails(page,passengers);
                        console.log("passenger details filled")
                        await page.waitForSelector('label[for="autoUpgradation"]',{timeout:0})
                        await page.click('label[for="autoUpgradation"]')
                        //selecting upi payment method
                        if(bookingDetails.paymentMode == "upi"){
                            await page.waitForSelector(`p-radiobutton[name="paymentType"][id="2"] span.ui-radiobutton-icon.ui-clickable`,{timeout:0})
                            await page.click(`p-radiobutton[name="paymentType"][id="2"] span.ui-radiobutton-icon.ui-clickable`)
                        }
                        
                        await(await page.$("button[type='submit']")).click()
                        await page.waitForNavigation({timeout:0,waitUntil:"domcontentloaded"})

                        const imageSrc = await getCaptcha(page)
                        ws.send(JSON.stringify({"details-confirmation-captcha":imageSrc}))
                        const availabilityAtPayment = await(await page.$("app-train-header div+div>div+div>span>span.pull-right")).evaluate(e=>e.innerText)
                        console.log("availability at payment:",availabilityAtPayment)
                        clientInputEvent.once("solved-details-confirmation-captcha",async(captcha)=>{
                            await page.waitForSelector("input#captcha",{timeout:0});
                            await page.type("input#captcha",captcha)
                            await page.waitForSelector("button.train_Search",{timeout:0})
                            await page.click("button.train_Search")
                            await page.waitForNavigation({timeout:0})
                            await page.waitForSelector("button+button",{timeout:0})
                            await page.click("button+button")
                            await page.waitForNavigation({timeout:0})
                            if(bookingDetails.paymentMode == "upi"){
                                await page.waitForSelector("input#vpaCheck",{timeout:0,visible:true})
                                console.log(bookingDetails.vpa)
                                await page.type("input#vpaCheck",bookingDetails.vpa)
                                console.log("vpa typed")
                                await page.waitForNetworkIdle({timeout:0})
                                await page.waitForSelector("input#upi-sbmt",{timeout:0,visible:true})
                                await page.click("input#upi-sbmt")
                            }
                            else{
                                await page.waitForSelector("li#debitLi",{timeout:0,visible:true})
                                await page.click("li#debitLi")
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
                                clientInputEvent.once("solved-otp",async(otp)=>{
                                    await page.type("input[type='password']",otp)
                                    await page.waitForSelector("button#submitBtn",{timeout:0,visible:true})
                                    //await page.click("button#submitBtn")
                                })
                            }
                        })

                    }
                }

            }).catch((errorInfo)=>{
                console.log(errorInfo)
            })

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

console.log('WebSocket server listening on port 3002');

async function fillPassangerDetails(page,passengers){
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
                accept()
            }
        }
    })
    
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

                    accept()
                }
                else if(inputs[i]){
                    await inputs[i].type(texts[i]);
                    /*await page.evaluate((element, text) => {
                        element.value = text;
                        element.dispatchEvent(new Event('input', { bubbles: true }));
                    }, inputs[i], texts[i]);*/
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


const calculateTimeDifferenceInMilliseconds = (givenTime) => {
    const moment = require('moment-timezone');
    const getIndiaTime = () => moment.tz('Asia/Kolkata');
    const indiaTime = getIndiaTime();
    console.log(indiaTime)
    const givenMoment = moment.tz(givenTime, 'Asia/Kolkata');
    console.log(givenMoment)
    const diffMilliseconds = indiaTime.diff(givenMoment);
    return diffMilliseconds;
};

//703
//02/26
//4594530111728952
