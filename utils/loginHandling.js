const loginHandler = (page,credentials,captcha)=>
    new Promise(async (accept,reject)=>{
        try{
            let usernameSelector = `input[placeholder="User Name"]`
            let passwordSelector = `input[placeholder="Password"]`
            await page.waitForSelector(usernameSelector,{timeout:0});
            await page.type(usernameSelector,credentials[0])
            await page.waitForSelector(passwordSelector,{timeout:0});
            await page.type(passwordSelector,credentials[1])
            await page.type("input#captcha",captcha)
            await page.click(`span > button.search_btn.train_Search[type="submit"]`)
    
            await page.waitForSelector(`a[routerlink="/logout"]`)
            accept("Login successfull")
        }
        catch(err){
            reject("Some error occured while logging in, please try again")
        }
    })

module.exports = loginHandler