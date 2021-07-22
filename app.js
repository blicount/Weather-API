

const fetch = require('node-fetch');
const moment = require('moment');
const fs = require('fs');

const citiesList = ['Jerusalem','New York', 'Dubai', 'Lisbon', 'Oslo', 'Paris',
'Berlin','Athens','Seoul','Singapore'];

let apiKey = '31df22a7e5378fa70ae5c5b664453715';

let baseUrl = `http://api.openweathermap.org/data/2.5/forecast?appid=${apiKey}`;


//function that return all cities weather data in parallel using promise.all funcion  
async function getWeatherData(){
    return Promise.all(citiesList.map(async city => {
        let url = `${baseUrl}&q=${city}`;
        let res;
        try{
            res = await fetch(url);
            res = await res.json()
        }catch(err){
            console.log(err);
        }
        return res;
    }));    
}


//function that snitize and extract relvent data
async function getRelevantTempCitiesData(cityWeather){
    // initilaze the object that will store all data
    let responseObject = {highestTemp : {}}
    console.log(cityWeather.city.name);

    responseObject.city = cityWeather.city.name;
    responseObject.cityId = cityWeather.city.id;

    for(dayWeather of cityWeather.list){
        console.log(dayWeather.main.temp,dayWeather.dt_txt,moment(dayWeather.dt_txt).format('dddd'));
        let currentDay = moment(dayWeather.dt_txt).format('dddd');
        responseObject.cityId = cityWeather.city.id;
        // init the day highest temp if not exsit 
        if(!responseObject.highestTemp[currentDay]){
            responseObject.highestTemp[currentDay] = 0;
        }
        if(dayWeather.main.temp > responseObject.highestTemp[currentDay]){
            responseObject.highestTemp[currentDay] = dayWeather.main.temp;
        }
    }
    console.log('response objct >> ', responseObject);
    return responseObject;
}


async function arrangetempByDay(cities){
    let tempByDay = []
    for(city of cities){
        for (const [day, temp] of Object.entries(city.highestTemp)) {
            if(!tempByDay[day]){
                tempByDay[day] = [];
                tempByDay[day].push({city: city.city , temp});
            } else{
                tempByDay[day].push({city: city.city , temp});        
            }
        }
    }
    return tempByDay
}

async function sortTempForDay(tempByDayObject){
    for(day in tempByDayObject){
        tempByDayObject[day].sort((a,b)=> {
            return b.temp - a.temp;
        });
    }
    return tempByDayObject;
}

const NUM_OF_CITIES_TO_DISPLAY = 5

async function writeToFile(tempToDay){

    let writeStream = fs.createWriteStream('./weather.csv');

    for( day in tempToDay){
        let row = `${day}`
        for(let i=0 ; i < NUM_OF_CITIES_TO_DISPLAY ; i++ ){
            row+= `,${tempToDay[day][i].city} ${tempToDay[day][i].temp}`
        }
        try{
            writeStream.write(`${row}\n`);
        } catch(err){
            throw new Error(`failed to write data to file ${err}`);
        }  
    }
            
}


async function main(){
    //get cities weather data from weather api
    let weatherData;
    try{
        weatherData = await getWeatherData();
    }catch(err){
        throw new Error(`error on get weather data from api > ${err}`);
    }
    
    //extract cities weather by day and filter non relevant data relevant data
    let citiesData;
    try{
        citiesData = await Promise.all(weatherData.map(async cityWeather => {
            return getRelevantTempCitiesData(cityWeather);
        }))
    }catch(err){
        throw new Error(`error on extracting data > ${err}`);
    }
    
    //arrange data to store key day and object of cities temp as value
    let tempByDay;
    try{
        tempByDay = await arrangetempByDay(citiesData);
    }catch(err){
        throw new Error(`error on arranging data > ${err}`);
    }
    
    // sort the dayes temp by temp value
    let sortedTempByDay
    try{
        sortedTempByDay = await sortTempForDay(tempByDay);
    }catch(err){
        throw new Error(`error on sorting data > ${err}`);
    }
    
    try{
        await writeToFile(sortedTempByDay);
    }catch(err){
        throw new Error(`error on writing data to file > ${err}`);
    }
    
    
}

main()
