const fs = require('fs');
const j = require('jimp');
const jimp = j.Jimp;
const parse = require('csv-parse/sync');

function loadCSV(file) {
    let data = fs.readFileSync(file).toString();
    let parsed = parse.parse(data, {columns: true, skip_empty_lines: true});
    return parsed;
}

async function createCard(type, text, out, subtitle = false, pick = 1) {
    let img = await jimp.read(`./cardassets/${type}-front.png`);
    let font= await j.loadFont(`./cardassets/cardfont-${type}.fnt`);

    let name = out.split("/")[1];
    if(fs.existsSync(`./input/${out.split("/")[1]}-icon.png`)) { //Replace the card's icon if it exists.
        img.composite(await jimp.read(`./cardassets/iconpatch-${type}.png`), 77, 571);
        img.composite(await jimp.read(`./input/${name}-icon.png`), 77, 571);
    }

    if(subtitle == true) {
        let subtitleFont = await j.loadFont(`./cardassets/subtitlefont-${type}.fnt`);
        img.composite(await jimp.read(`./cardassets/subtitlepatch-${type}.png`), 0, 0);
        img.print({font: subtitleFont, x: 132, y: img.height-105-2, text: name, align: 'top-left', maxWidth: img.width-160});
    }

    if((pick == 2 || pick == 3) && type == "black") img.composite(await jimp.read(`./cardassets/pick-${pick}.png`), 0, 0);
    
    img.print({font, x: 80, y: 80, text: text, align: 'top-left', maxWidth: img.width-160});
    await img.write(out)
}


async function main() {
    fs.readdirSync("./input").forEach(file => {
        let subtitleList = loadCSV("./input/subtitles.csv");
        let subtitle = false;
        if(file.split(".")[1] != "csv") return;
        if(file == "subtitles.csv") return;
        if(file == "manydecks.csv") return;
        if(subtitleList.find(sub => sub.list == file)) subtitle = true;
        let outputFolder = file.split(".")[0];
        if(!fs.existsSync(`./output/${outputFolder}`)) {
            fs.mkdirSync(`./output/${outputFolder}`);
            let i = 0;
            let parsed = loadCSV(`./input/${file}`);
            parsed.forEach(card => {
                createCard(card.type, card.text, `output/${outputFolder}/card_${i}.png`, subtitle, card.pick);
                console.log(`Created card ${i}, type: ${card.type}, text: ${card.text}`);
                i++;
            });
            //console.log(data);
        } else {
            console.log(`./output/${outputFolder} already exists! Skipping...`);
            return;
        }
    })
    //createCard("black", "Test eeee", `output/Cards Against Humanity/output.png`, false, 3);
}

main().catch(console.error);