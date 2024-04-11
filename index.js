import express from "express";
import dotenv from "dotenv";
import axios from "axios";
import uniqid from "uniqid";
import sha256 from "sha256";

const app = express();
dotenv.config();
const merchantTransactionID = uniqid(); //creates an unique id at each call.

app.get("/", (req, res) => {
    res.send("Phonpe Integration");
});

//API Calls
app.get("/pay", (req, res) => {
    const payEndpoint = "/pg/v1/pay";
    const userID = "MU933039309229373";

    const payload = {
        "merchantId": process.env.MERCHANT_ID,
        "merchantTransactionId": merchantTransactionID,
        "merchantUserId": userID,
        "amount": 10000, //in paise
        "redirectUrl": `http://localhost:5000/redirect-url/${merchantTransactionID}`,
        "redirectMode": "REDIRECT",
        "mobileNumber": "9999999999",
        "paymentInstrument": {
            "type": "PAY_PAGE"
        }
    };

    //X-Verify & HAshing Algo for base-64 encoded payload
    const bufferObj = Buffer.from(JSON.stringify(payload), "utf8");
    const base64EncodedPayload = bufferObj.toString("base64");
    const xVerify = sha256(base64EncodedPayload + payEndpoint + process.env.SALT_KEY) + "###" + process.env.SALT_INDEX;

    const options = {
        method: 'post',
        url: `${process.env.PHONEPE_HOST_URL}${payEndpoint}`,
        headers: {
            accept: 'application/json',
            'Content-Type': 'application/json',
            'X-VERIFY': xVerify
        },
        data: {
            request: base64EncodedPayload
        }
    };
    axios
        .request(options)
        .then(function (response) {
            console.log(response.data);
            const url = response.data.data.instrumentResponse.redirectInfo.url;
            res.redirect(url);
        })
        .catch(function (error) {
            console.error(error);
        });
});

app.get("/redirect-url/:merchantTransactionID", (req, res) => {
    const { merchantTransactionID } = req.params;
    console.log("merchantTransactionId: ", merchantTransactionID)
    if (merchantTransactionID) {
        //x-verifying using sha256
        const xVerify = sha256(`/pg/v1/status/${process.env.MERCHANT_ID}/${merchantTransactionID}` + process.env.SALT_KEY) + "###" + process.env.SALT_INDEX;
        const options = {
            method: 'get',
            url: `${process.env.PHONEPE_HOST_URL}/pg/v1/status/${process.env.MERCHANT_ID}/${merchantTransactionID}`,
            headers: {
                accept: 'application/json',
                'Content-Type': 'application/json',
                'X-MERCHANT_ID': merchantTransactionID,
                'X-VERIFY': xVerify
            },

        };
        axios
            .request(options)
            .then(function (response) {
                console.log(response.data);
                res.send(response.data);
            })
            .catch(function (error) {
                console.error(error);
            });
    }
    else {
        res.send({ error: "Error in payment" });
    }
})

app.listen(process.env.PORT, () => {
    console.log(`Listening on Port ${process.env.PORT}`);
});