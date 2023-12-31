const express = require('express');
const { PKPass } = require("passkit-generator");
const fs = require("fs");
const path = require("path");
const axios = require('axios');
const cors = require('cors');


const wwdr = fs.readFileSync(path.resolve(__dirname, "./wwdr.pem"));
const signerCert = fs.readFileSync(path.resolve(__dirname, "./signerCert.pem"));
const signerKey = fs.readFileSync(path.resolve(__dirname, "./signerKey.pem"));

const app = express();
const port = 3000;

app.use(express.json());
app.use(cors());

app.get('/', (req, res) => {
    res.json({"test":'Hello World!'});
});

app.post('/pass', async (req, res) => {
    try{
        const { primary_fields, secondary_fields, auxiliary_fields, back_fields, thumbnail, logo, card_url, card_id  } = req.body;
        
        const errors = [];
        const expectedFields = ['primary_fields', 'secondary_fields', 'auxiliary_fields', 'thumbnail', 'logo', 'card_url'];

        expectedFields.forEach((fieldName) => {
            if (!req.body.hasOwnProperty(fieldName)) {
              errors[fieldName] = [`${fieldName} is required`];
            } else if (fieldName === 'thumbnail' || fieldName === 'logo' || fieldName === 'card_url' || fieldName === 'card_id') {
              if (typeof req.body[fieldName] !== 'string' || req.body[fieldName].trim() === '') {
                errors[fieldName] = [`${fieldName} must be a non-empty string`];
              }
            } else if (typeof req.body[fieldName] !== 'object' || Object.keys(req.body[fieldName]).length === 0) {
              errors[fieldName] = [`${fieldName} must be a non-empty object`];
            }
          });

        if (Object.keys(errors).length > 0) {
            console.log('errors: ', errors);
            return res.status(400).json({ errors });
        }
        const pass = await PKPass.from({
            model: "./model/DBC.pass",
            certificates: {
                wwdr,
                signerCert,
                signerKey,
                signerKeyPassphrase: '1234'
            },
        }, {
            // keys to be added or overridden
            serialNumber: `HB17a7K4aNy0safza1_${card_id}`,
            teamIdentifier: "PVY2777K6Y",
            webServiceURL: card_url,
            authenticationToken: "vxwxd7J8AlNNFPS8k0a0FfUFtq0ewzFdc",
            description: "Digital Bussinees Card",
        });

        pass.headerFields.push(primary_fields);
        // pass.primaryFields.push(primary_fields)

        pass.secondaryFields.push(secondary_fields)

        pass.auxiliaryFields.push(auxiliary_fields)

        if ( back_fields.length > 0 ) {
            back_fields.forEach((field) => {
                pass.backFields.push(field)
            })
        }

        pass.setBarcodes({
            message: card_url,
            format: "PKBarcodeFormatQR",
            altText: card_id
        });

        const passName = Date.now() * 1000 * Math.floor(Math.random() * 9999);

        // pass.setNFC({
        //     message: card_url,
        //     encryptionPublicKey:  passName.toString()
        // })

        console.log(Date.now());

        const thumbnailRes = await axios.get(thumbnail, {responseType: 'arraybuffer'})
        const thumbnailBuffer = Buffer.from(thumbnailRes.data, 'utf-8');

        const logoRes = await axios.get(logo, {responseType: 'arraybuffer'})
        const logoBuffer = Buffer.from(logoRes.data, 'utf-8');

        pass.addBuffer("thumbnail.png", thumbnailBuffer);
        pass.addBuffer("logo.png", logoBuffer);

        const buffer = pass.getAsBuffer();

        // storage to local file
        // fs.writeFileSync(`${passName}.pkpass`, buffer);
        console.log("Pass created successfully");

        res.setHeader('Content-Type', 'application/vnd.apple.pkpass');
        res.setHeader('Content-Disposition', `attachment; filename=${passName}.pkpass`);
        res.send(buffer);
        // res.json({"msg":'created.'})
    }
    catch (error) {
        console.error('Error creating pass:', error);
        res.status(500).send('An error occurred while creating the pass.', error);
    }
});



app.listen(port, () => {
    console.log(`Server is listening at http://localhost:${port}`);
});