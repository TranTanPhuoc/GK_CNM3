const express = require('express')
const app = express();
const port = 3000;
const path = require("path");
const multer = require("multer");
 require("dotenv/config")
const AWS = require('aws-sdk')
console.log({
    region: process.env.REGION,
    accessKeyId: process.env.ACCESSKEYID,
    secretAccessKey: process.env.SECRETACCESSKEY,
});
const config = new AWS.Config({
    region: process.env.REGION,
    accessKeyId: process.env.ACCESSKEYID,
    secretAccessKey: process.env.SECRETACCESSKEY,
});
AWS.config = config;
const docClient = new AWS.DynamoDB.DocumentClient();
const tablePaper = 'Paper';
const convertToFormJson = multer();
app.use("/static", express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: true }));
const { check, validationResult } = require('express-validator')

app.get("/", (req, res) => {
    const params = {
        TableName: tablePaper,
    };
    docClient.scan(params, (err, data) => {
        if (err) {
            res.send(err)
        } else {
            res.render("index", { data: data.Items });
        }
    })
});
app.post("/", convertToFormJson.fields([]),[
    check('namePaper', 'Tên bài báo không dưới 3 kí tự')
        .exists()
        .isLength({ min: 3 }),
    check('nameAuthor', 'Tác giả không dưới 3 kí tự')
        .exists()
        .isLength({ min: 3 }),
    check('ISBN', 'Không rỗng')
        .exists()
        .isLength({ min: 1 }),
    ]
         ,(req, res) => {
    const { idPaper, namePaper, nameAuthor, ISBN, pageNumber, year } = req.body;
    const errors = validationResult(req);
    if(!errors.isEmpty()){
        const params = {
            TableName: tablePaper,
            alert : errors.array()
        };
        docClient.scan(params, (err, data) => {
            if (err) {
                res.send(err)
            } else {
                res.render("index", { data: data.Items , alert : params.alert});
            }
        })
    }
    else{
        const params = {
        TableName: tablePaper,
        Item: {
            idPaper,
            namePaper,
            nameAuthor,
            ISBN,
            pageNumber,
            year,
            }
        };
        docClient.put(params, (err, data) => {
            if (err) {
                res.send(err)
            } else {
                res.redirect("/");
            }
        });
    }
});

app.post("/delete", convertToFormJson.fields([]), (req, res) => {
    const { idPaper } = req.body;
    const params = {
        TableName: tablePaper,
        Key: {
            idPaper
        }
    }
    docClient.delete(params, (err, data) => {
        if (err) {
            res.send(err)
        } else {
            res.redirect("/");
        }
    });
});

app.listen(port, () => {
    console.log(`Listen port : ${port}`);
});