const express = require('express');
const axios = require('axios');
const app = express();

require('dotenv/config');

const HmacMD5 = require('crypto-js/hmac-md5');
const base64 = require('crypto-js/enc-base64');

async function login(){
    try {
        var uri = process.env.LOGINURI;
        var secret_key = process.env.MYSECRETKEY;
        var api_key = process.env.APIKEY;
        var computedHash = HmacMD5(uri, secret_key);
        var computedHashString = computedHash.toString(base64); 
    

        const response = await axios.post(process.env.LOGINURI, {
            Host: 'authservice.priaid.ch'
        },{
            headers: {
                'Authorization': 'Bearer '+api_key+':'+computedHashString
            }
        });

        console.log(response.data.Token)

        return(response.data.Token);


    } catch (err) {
        console.log(err);
    }
}

async function traduzirDoenca(doenca){
    var options = {
        method: 'GET',
        url: 'https://translated-mymemory---translation-memory.p.rapidapi.com/api/get',
        params: {q: doenca, langpair: 'en|pt'},
        headers: {
          'x-rapidapi-key': process.env.RAPIDAPIKEY,
          'x-rapidapi-host': 'translated-mymemory---translation-memory.p.rapidapi.com'
        }
      };
      
      axios.request(options).then(function (response) {
          console.log(response.data.matches[0].translation);
      }).catch(function (error) {
          console.error(error);
      });
}
async function requestDoencas() {
    const token = await login()
    try {
        const response = await axios.get(`https://sandbox-healthservice.priaid.ch/issues?token=${token}&format=json&language=en-gb`);
        if (response.status === 200) {
            response.data.map(item=>{
                //console.log(item)
                traduzirDoenca(item.Name)
            })
            return response.data
        }

    } catch (err) {
        console.log(err);
    }
}

app.get('/',(request, response)=>{
    requestDoencas();
    return response.json({message: 'Server is up'});
})

app.listen(3333);