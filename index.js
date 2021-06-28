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
    const token = await login()

    let sintomasconvertido = [];

    try {
        sintomasconvertido = JSON.stringify(sintomas);

        console.log(sintomasconvertido)
        console.log(typeof(sintomasconvertido))
        console.log(genero)
        const response = await axios.get(process.env.HEALTHURI+`/diagnosis?token=${token}&symptoms=${sintomasconvertido}&gender=${genero}&year_of_birth=${dataNascimento}&language=en-gb`);
        if (response.status === 200) {
            return response.data
        }

    } catch (err) {
        console.log(err);
    }
}

app.get('/',async (request, response)=>{
    let doencas = await requestTodosSintomas();
    let doencasTraduzidas = [];
    
         let res = doencas.map(async item=>{
        
            doencatraduzida = await traduzirDoenca(item.Name)
            console.log(doencatraduzida)
            doencasTraduzidas.push({ID: item.ID, Name: doencatraduzida})
        })
 
        Promise.all(res).then(
        ()=>{
            return response.json({data: doencasTraduzidas});
        }
    )
    //return response.json({data: 'server is up'});

    
})

app.post('/', async function (req, res) {
    let issuesidArray = JSON.parse(req.query.issues);
    let dataNascimento = parseInt(req.query.anoNascimento, 10);
    let genero = req.query.genero;
    //let issues = problemas.split(',');
    //let problemastraduzidosparaingles = [];

    try{
        const response = await Diagnostico(issuesidArray, dataNascimento, genero)
        console.log(response)
        const resposta = []
        const result = response.map(async item=>{
            let nometraduzido = ''
            let icdNameTraduzido = ''
            let ProfNameTraduzido = ''
            nometraduzido = await traduzirDoenca(item.Issue.Name)
            icdNameTraduzido = await traduzirDoenca(item.Issue.IcdName)
            ProfNameTraduzido = await traduzirDoenca(item.Issue.ProfName)
         
             resposta.push(
                {
                Problema:{
                    ID: item.Issue.ID,
                    Name: nometraduzido,
                    IndiceAcerto: item.Issue.Accuracy,
                    Icd: item.Issue.Icd,
                    IcdName: icdNameTraduzido,
                    ProfName: ProfNameTraduzido,
                    Ranking: item.Issue.Ranking
                    },
                Especializacao: item.Specialisation
            }
        )
        })

        Promise.all(result).then(()=>{
            console.log(resposta)
            res.send({data: resposta});
            //return response.json({data: resposta});
        })
    }
    catch{
        (err)=>{
            console.log(err)
        }
    }
    
});

app.listen(3000);