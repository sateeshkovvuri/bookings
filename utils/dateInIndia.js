const getDateInIndia = (offset)=>{
    const indiaTimeZone = 'Asia/Kolkata';
    const today = new Date();
    const requiredDay = new Date(today.getTime() + offset*86400000);
    const options = { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: indiaTimeZone };
    const internationDateTimeObj = new Intl.DateTimeFormat('en-IN', options);
    
    if(offset == 1){
      //tommorrow's date in dd/mm/yyyy format
      return internationDateTimeObj.format(requiredDay)
    }
    else{
      //today's date in yyyy-mm-dd format (offset=0;)
      const [day,month,year] = internationDateTimeObj.formatToParts(requiredDay).filter(part=>part.type!='literal')
      return `${year.value}-${month.value}-${day.value}`
    }
}

module.exports = getDateInIndia
  