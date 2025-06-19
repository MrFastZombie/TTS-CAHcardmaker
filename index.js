const fs = require('fs');
const j = require('jimp'); //This package handles image manipulation.
const jimp = j.Jimp;
const parse = require('csv-parse/sync');
const text2img = require('text-to-image');

const manydecksendpoint = "https://decks.rereadgames.com/api/decks/"; //+ deck ID

/**
 * Loads a CSV file.
 * @param {string} file FIle path to load CSV from.
 * @returns A parsed CSV object.
 */
function loadCSV(file) {
    let data = fs.readFileSync(file).toString();
    let parsed = parse.parse(data, {columns: true, skip_empty_lines: true});
    return parsed;
}

/**
 * Creates a card png from the data put into it.
 * @param {string} type Either a white or black card.
 * @param {string} text Text displayed on the card.
 * @param {string} out Output path
 * @param {boolean} subtitle Whether to replace the standard CAH subtitle with the deck title or not.
 * @param {number} pick Amount of cards that should be picked for this card.
 */
async function createCard(type, text, out, subtitle = false, pick = 1, name = "") {
    let img = await jimp.read(`./cardassets/${type}-front.png`);
    let font= await j.loadFont(`./cardassets/cardfont-${type}.fnt`);
    let fontColor = "#000000";
    let fontSize = 34;
    if(type == "black") fontColor = "#FFFFFF";

    let fname = out.split("/")[1];
    if(fs.existsSync(`./input/${out.split("/")[1]}-icon.png`)) { //Replace the card's icon if it exists.
        img.composite(await jimp.read(`./cardassets/iconpatch-${type}.png`), 77, 571);
        img.composite(await jimp.read(`./input/${fname}-icon.png`), 77, 571);
    }

    if(subtitle == true) {
        let subtitleFont = await j.loadFont(`./cardassets/subtitlefont-${type}.fnt`);
        img.composite(await jimp.read(`./cardassets/subtitlepatch-${type}.png`), 0, 0);
        img.print({font: subtitleFont, x: 132, y: img.height-105-2, text: name, align: 'top-left', maxWidth: img.width-160});
    }

    if((pick == 2 || pick == 3) && type == "black") img.composite(await jimp.read(`./cardassets/pick-${pick}.png`), 0, 0);
    
    var textURI = text2img.generateSync(text, {fontFamily: 'HelveticaNeue', fontWeight: 'bold', fontSize: fontSize, lineHeight: 39, maxWidth: img.width-140, textAlign: 'left', textColor: fontColor, bgColor: "transparent"});
    var textImg = await jimp.read(textURI);

    while(textImg.height > img.height-220) {
        fontSize = fontSize - 1;
        textURI = text2img.generateSync(text, {fontFamily: 'HelveticaNeue', fontWeight: 'bold', fontSize: fontSize, lineHeight: 39, maxWidth: img.width-140, textAlign: 'left', textColor: fontColor, bgColor: "transparent"});
        textImg = await jimp.read(textURI);
    }

    img.composite(textImg, 70, 60);
    await img.write(out)
    //await img.write(`./output/test.png`);
}

/**
 * Gets data either from the cache, or from the ManyDecks API.
 * @param {string} ID ManyDecks deck ID
 * @returns {JSON} Response JSON
 */
async function requestManyDeck(ID) {
    try {
        let json = '';

        if(!fs.existsSync(`./manydeckscache/${ID}.json`)) { //File doesn't exist
            console.log(`Deck ${ID} is not cached. Requesting...`);
            let response = await fetch(manydecksendpoint+ID);
            json = await response.json();
            fs.writeFileSync(`./manydeckscache/${ID}.json`, JSON.stringify(json));
        } else if(new Date(fs.statSync(`./manydeckscache/${ID}.json`).birthtime.getTime() + 7*24*60*60*1000)  <= new Date()) { //Cache is older than 7 days
            console.log(`Deck ${ID} is outdated. Requesting...`);
            let response = await fetch(manydecksendpoint+ID);
            json = await response.json();
            fs.writeFileSync(`./manydeckscache/${ID}.json`, JSON.stringify(json));
        } else {
            console.log(`Deck ${ID} is cached. Loading...`);
            json = JSON.parse(fs.readFileSync(`./manydeckscache/${ID}.json`));
        }

        return json;
    } catch (error) {
        console.log(error);
        return;
        
    }
}

/**
 * Takes a ManyDecks deck and processes it into a format that this script can use.
 * @param {JSON} deck Deck Data in JSON format
 * @returns An array of card data.
 */
function processDeck(deck) {
    let i = 0;
    let data = [];
    let whiteCards = deck.responses;
    let blackCards = deck.calls;
    whiteCards.forEach(card => {
        data[i] = {
            type: "white",
            text: card,
            pick: ''
        }
        i++;
    });
    blackCards.forEach(card => {
        let string = "";
        pick = 1;

        card[0].forEach(line => {
            if(line.toString() != "[object Object]") string = string + line + " ";
            else {
                string = string + "_______ ";
                pick++;
            }
        })

        string = string.slice(0, -1);
        if(string.slice(-1) == "_") string = string + ".";

        if(pick > 1) pick = pick - 1; //Prevents double counting the first blank.

        data[i] = {
            type: "black",
            text: string,
            pick: pick
        }
        i++;
    });
    return data;
}

/**
 * Creates 8*5 sheets that can be imported into Table Top Simulator.
 * @param {string} path Path to the folder that contains the cards to put on a sheet.
 * @returns Nothing
 */
async function createSheets(path) {
    let iw = 1;
    let ib = 1;
    const sheetwidth = 8;
    const sheetheight = 5;
    const sheetcount =  sheetwidth * sheetheight;
    const sheettemplate = await jimp.read(`./cardassets/sheet-template.png`);
    var whiteSheetsPrinted = 0;
    var blackSheetsPrinted = 0;
    var whiteSheet = undefined;
    var blackSheet = undefined;
    var whiteOffsetX = 0;
    var blackOffsetX = 0;
    var whiteOffsetY = 0;
    var blackOffsetY = 0;

    let files = fs.readdirSync(path);
    files.sort((a, b) => {
        let numa = parseInt(a.split("_")[1].split(".")[0]);
        let numb = parseInt(b.split("_")[1].split(".")[0]);
        return numa-numb;
    });

    for (const file of files) {
        let img = await jimp.read(path + "/" + file);
        if(file.split(".")[1] != "png") return;
        if(file.split("-")[1] == "sheet") return;
        else if(file.split("-")[0] == "white") {
            if(whiteSheet == undefined) { //no sheets yet
                whiteSheet = await jimp.read(`./cardassets/sheet-template.png`);
                await whiteSheet.composite(img, 0, 0);
                whiteOffsetX = whiteOffsetX + img.width;
            } else if(iw > sheetcount) { // new sheet needed
                whiteSheetsPrinted++;
                whiteSheet.write(`${path}/white-sheet_${whiteSheetsPrinted}.png`);
                whiteSheet = await jimp.read(`./cardassets/sheet-template.png`);
                whiteOffsetY = 0;
                whiteOffsetX = 0;
                await whiteSheet.composite(img, whiteOffsetX, whiteOffsetY);
                whiteOffsetX = whiteOffsetX + img.width;
                iw = 1;
            } else if (iw % sheetwidth == 0) { //Move to next row
                await whiteSheet.composite(img, whiteOffsetX, whiteOffsetY);
                whiteOffsetY = whiteOffsetY + img.height;
                whiteOffsetX = 0;
            } else {
                await whiteSheet.composite(img, whiteOffsetX, whiteOffsetY);
                whiteOffsetX = whiteOffsetX + img.width;
            }
            iw++;
        }
        else if(file.split("-")[0] == "black") {
            if(blackSheet == undefined) { //no sheets yet
                blackSheet = await jimp.read(`./cardassets/sheet-template.png`);
                await blackSheet.composite(img, 0, 0);
                blackOffsetX = blackOffsetX + img.width;
            } else if(ib > sheetcount) { // new sheet needed
                blackSheetsPrinted++;
                blackSheet.write(`${path}/black-sheet_${blackSheetsPrinted}.png`);
                blackSheet = await jimp.read(`./cardassets/sheet-template.png`);
                blackOffsetY = 0;
                blackOffsetX = 0;
                await blackSheet.composite(img, blackOffsetX, blackOffsetY);
                blackOffsetX = blackOffsetX + img.width;
                ib = 1;
            } else if (ib % sheetwidth == 0) { //Move to next row
                await blackSheet.composite(img, blackOffsetX, blackOffsetY);
                blackOffsetY = blackOffsetY + img.height;
                blackOffsetX = 0;
            } else {
                await blackSheet.composite(img, blackOffsetX, blackOffsetY);
                blackOffsetX = blackOffsetX + img.width;
            }
            ib++;
        }
    }

    whiteSheetsPrinted++;
    blackSheetsPrinted++;
    whiteSheet.write(`${path}/white-sheet_${whiteSheetsPrinted}.png`);
    blackSheet.write(`${path}/black-sheet_${blackSheetsPrinted}.png`);

}

async function main() {
    if(!fs.existsSync(`./output`)) fs.mkdirSync(`./output`);
    //await createCard("white", "This is a test card", `output/test.png`, false, 1, "test");
    for (const file of fs.readdirSync("./input")) {
        let optionsList = loadCSV("./input/listoptions.csv");
        let subtitle = false;
        let sheet = false;
        if(file.split(".")[1] != "csv") continue;
        if(file == "listoptions.csv") continue;
        if(file == "manydecks.csv") continue;

        optionsList.forEach(e => {
            if(e.list == file) {
                if(e.subtitles == "true") subtitle = true;
                if(e.sheet == "true") sheet = true;
            }
        });
        
        let outputFolder = file.split(".")[0];
        if(!fs.existsSync(`./output/${outputFolder}`)) {
            fs.mkdirSync(`./output/${outputFolder}`);
            let i = 0;
            let parsed = loadCSV(`./input/${file}`);
            let tasks = [];
            parsed.forEach(card => {
                tasks.push(createCard(card.type, card.text, `output/${outputFolder}/${card.type}-card_${i}.png`, subtitle, card.pick, outputFolder));
                console.log(`Created card ${i}, type: ${card.type}, text: ${card.text}`);
                i++;
            });
            await Promise.all(tasks);
            if(sheet) await createSheets(`./output/${outputFolder}`);
            //console.log(data);
        } else {
            console.log(`./output/${outputFolder} already exists! Skipping...`);
            continue;
        }
    }

    let manydecks = await loadCSV("./input/manydecks.csv");
    for (let deck of manydecks) {
        let name = deck.name;
        let path = name.replaceAll(/[#%&{}\\<>*?\/$!'":@+`|=]/g,'');
        if(!fs.existsSync(`./output/${path}`)) {
            let deckData = await requestManyDeck(deck.id);
            let processedDeck = processDeck(deckData);
            let subtitle = false;
            let sheet = false;
            if(deck.Subtitle == "true") subtitle = true;
            if(deck.sheet == "true") sheet = true;
            fs.mkdirSync(`./output/${path}`);
            let i = 0;
            let tasks = [];

            for await (let card of processedDeck) {
                tasks.push(createCard(card.type, card.text, `output/${path}/${card.type}-card_${i}.png`, subtitle, card.pick, name));
                //console.log(`Created card ${i}, type: ${card.type}, text: ${card.text}`);
                i++;
            }

            await Promise.all(tasks);
            if(sheet) await createSheets(`./output/${path}`);

        } else {
            console.log(`./output/${path} already exists! Skipping...`);
            continue;
        }
    }
}

main().catch(console.error);