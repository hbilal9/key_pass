const express = require('express');
const { PKPass } = require("passkit-generator");
const fs = require("fs");
const path = require("path");

const wwdr = fs.readFileSync(path.resolve(__dirname, "./wwdr.pem"));
const signerCert = fs.readFileSync(path.resolve(__dirname, "./signerCert.pem"));
const signerKey = fs.readFileSync(path.resolve(__dirname, "./signerKey.pem"));

const app = express();
const port = 3000;

app.get('/', (req, res) => {
    res.json({"test":'Hello World!'});
});

app.get('/pass', async (req, res) => {
    try{
        const pass = await PKPass.from({
            /**
             * Note: .pass extension is enforced when reading a
             * model from FS, even if not specified here below
             */
            model: "./model/DBC.pass",
            certificates: {
                wwdr,
                signerCert,
                signerKey,
                signerKeyPassphrase: '1234'
            },
        }, {
            // keys to be added or overridden
            serialNumber: "AAGH44625236dddaffbda",
            teamIdentifier: "PVY2777K6Y",
            webServiceURL: "https://example.com/passes/",
            authenticationToken: "vxwxd7J8AlNNFPS8k0a0FfUFtq0ewzFdc",
            description: "Demo pass",
        });

        pass.primaryFields.push({
            key: "name",
            label: "Name",
            value: "Jon Doe",
        })

        pass.secondaryFields.push({
            key: "bank",
            label: "Bank",
            value: "UBL",
        })

        pass.auxiliaryFields.push({
            key: "balance",
            label: "Balance",
            value: "$10",
        })

        const buffer = pass.getAsBuffer();
        // storage to local file
        // fs.writeFileSync("myFirstPass.pkpass", buffer);
        console.log("Pass created successfully");

        res.setHeader('Content-Type', 'application/vnd.apple.pkpass');
        res.setHeader('Content-Disposition', 'attachment; filename=pass.pkpass');
        res.send(buffer);
        // res.json({"msg":'created.'})
    }
    catch (error) {
        console.error('Error creating pass:', error);
        res.status(500).send('An error occurred while creating the pass.');
    }
});



app.listen(port, () => {
    console.log(`Server is listening at http://localhost:${port}`);
});