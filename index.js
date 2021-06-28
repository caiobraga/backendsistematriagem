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

    try {
        var options = {
            method: 'GET',
            url: 'https://translated-mymemory---translation-memory.p.rapidapi.com/api/get',
            params: {q: doenca, langpair: 'en|pt'},
            headers: {
              'x-rapidapi-key': process.env.RAPIDAPIKEY,
              'x-rapidapi-host': 'translated-mymemory---translation-memory.p.rapidapi.com'
            }
          };
          
          response = await axios.request(options)

          if (response.status === 200) {
            return response.data.matches[0].translation
          }

    } catch (err) {
        console.log(err);
    }

   
}

async function traduzirparaIngles(input){

    try {
        var options = {
            method: 'GET',
            url: 'https://translated-mymemory---translation-memory.p.rapidapi.com/api/get',
            params: {q: input, langpair: 'pt|en'},
            headers: {
              'x-rapidapi-key': process.env.RAPIDAPIKEY,
              'x-rapidapi-host': 'translated-mymemory---translation-memory.p.rapidapi.com'
            }
          };
          
          response = await axios.request(options)

          if (response.status === 200) {
            return response.data.matches[0].translation
          }

    } catch (err) {
        console.log(err);
    }

   
}

async function requestDoencas() {
    const token = await login()

    try {
        const response = await axios.get(process.env.HEALTHURI+`/issues?token=${token}&format=json&language=en-gb`);
        if (response.status === 200) {
            return response.data
        }

    } catch (err) {
        console.log(err);
    }
}

async function requestTodosSintomas() {
    const token = await login()

    try {
        const response = await axios.get(process.env.HEALTHURI+`/symptoms?token=${token}&format=json&language=en-gb`);
        if (response.status === 200) {
            return response.data
        }

    } catch (err) {
        console.log(err);
    }

}

async function Diagnostico(sintomas, dataNascimento, genero) {

    let sintomasArraySerializada = JSON.parse(sintomas)
    console.log(sintomasArraySerializada,dataNascimento,genero)
    console.log(typeof(sintomasArraySerializada))
    const token = await login()
    try {
        const response = await axios.get(process.env.HEALTHURI+`/diagnosis?token=${token}&symptoms=${sintomasArraySerializada}&gender${genero}&year_of_birth=${dataNascimento}&language=en-gb`);
        console.log(response)
        if (response.status === 200) {
            console.log(response)
            return response.data
        }
    }
    catch {
        (err)=>{console.log(err);}
    }
}

app.get('/',async (request, response)=>{
    /*let doencas = await requestDoencas();
    let doencasTraduzidas = [];
    
         let res = doencas.map(async item=>{
        
            doencatraduzida = await traduzirDoenca(item.Name)
            console.log(doencatraduzida)
            doencasTraduzidas.push(doencatraduzida)
        })
 
        Promise.all(res).then(
        ()=>{
            return response.json({data: doencasTraduzidas});
        }
    )*/
    return response.json({data: 'server is up'});

    
})


app.post('/', async function (req, res) {
    let issuesidArray = [];
    let problemas = req.query.issues;
    let dataNascimento = parseInt(req.query.anoNascimento, 10);
    let genero = req.query.genero;
    let issues = problemas.split(',');
    let problemastraduzidosparaingles = [];

    console.log(typeof(dataNascimento))
    console.log(dataNascimento)
    let todosSintomas = await requestTodosSintomas()

    let response = issues.map(async (item)=>{
        let res = await traduzirparaIngles(item)
        console.log(res);

        problemastraduzidosparaingles.push(res[0].toUpperCase() + res.substr(1));
    })

    Promise.all(response).then(()=>{
        console.log(problemastraduzidosparaingles)
        
        let response = problemastraduzidosparaingles.map((doenca)=>{
            todosSintomas.map((item)=>{
                console.log(item)
                if(item.Name == doenca){
                    issuesidArray.push(item.ID)
                    console.log("achou")
                    return
                }
            })
        })

        Promise.all(response).then(async ()=>{
            console.log(issuesidArray);

            try {
                let response = await Diagnostico(JSON.stringify(issuesidArray), dataNascimento, genero)
                if (response.status === 200) {
                    console.log(response)
                    return response.data
                }
                console.log(response)
            }
            catch {
                (err)=>{console.log(err);}
            }
    


        })

    })
    //let doencas = await requestDoencasReal();
   // console.log(doencas)
    res.send('Got a POST request');
});

app.listen(3000);