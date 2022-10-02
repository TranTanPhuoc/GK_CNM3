const express = require('express') // Khai báo thư viện Express
const app = express(); 
const port = 3000; // Gán cho port là 3000
const path = require("path");
const multer = require("multer");  // Khai báo thư viện multer
require("dotenv/config") // dùng để connect tới file .env
const AWS = require('aws-sdk') // Khai báo thư viện aws-sdk
console.log({
    region: process.env.REGION,
    accessKeyId: process.env.ACCESSKEYID,
    secretAccessKey: process.env.SECRETACCESSKEY,
}); // In thử các region,accessKeyId,secretAccessKey ra để xem thử đã lấy được những thông tin trên file env được chưa
const config = new AWS.Config({
    region: process.env.REGION,
    accessKeyId: process.env.ACCESSKEYID,
    secretAccessKey: process.env.SECRETACCESSKEY,
}); // Khai báo biến config để Config đến AWS thông qua các thông tin region,accessKeyId,secretAccessKey
AWS.config = config; // Kết nối đến AWS
const docClient = new AWS.DynamoDB.DocumentClient(); // Kết nối đến DynamoDB
const tablePaper = 'Paper'; // table trên AWS phải giống với tableName mà mình cần khai báo.
const convertToFormJson = multer(); // Khai báo này dùng để giúp cho dễ dàng xử lí dữ liệu multipart/form-data
app.use("/static", express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs"); // Dùng để đọc được file ejs
app.set("views", path.join(__dirname, "views")); // Cho nó đọc tất cả các file ejs trong folder views
const bodyParser = require("body-parser"); // Khai báo body parser
app.use(bodyParser.urlencoded({ extended: true }));  //config parser -> get data from form
const { check, validationResult } = require('express-validator') // Khai báo thư viện express-validator 

//Get tất cả các data trong tablePaper từ DynamoDB trên AWS
app.get("/", (req, res) => {
    const params = {
        TableName: tablePaper,
    };
    docClient.scan(params, (err, data) => {
        if (err) {
            res.send(err)
        } else {
            // Truyền các dữ liệu vào file index.ejs với Object có tên là data
            res.render("index", { data: data.Items });
        }
    })
});
//Khi nhấn submit thì tất cả các dữ liệu trên Input của template ejs sẽ được kiểm tra có hợp lệ hay không nếu hợp lệ thì nó sẽ được đẩy lên tablePaper trên DynamoDB AWS không thì nó sẽ 
// Hiển thị lại form mời nhập lại các thông tin với các Message yêu cầu nhập lại những Input đã sai.
app.post("/", convertToFormJson.fields([]),[
    // Bài báo không được dưới 3 kí tự
    check('namePaper', 'Tên bài báo không dưới 3 kí tự')
        .exists()
        .isLength({ min: 3 }),
    // Tên tác giả không được dưới 3 kí tự
    check('nameAuthor', 'Tác giả không dưới 3 kí tự')
        .exists()
        .isLength({ min: 3 }),
    // ISBN không được rỗng
    check('ISBN', 'Không rỗng')
        .exists()
        .isLength({ min: 1 }),
    ]
         ,(req, res) => {
    const { idPaper, namePaper, nameAuthor, ISBN, pageNumber, year } = req.body;
    // Kiểm ra nếu có lỗi sẽ gán các lỗi vào biến Errors
    const errors = validationResult(req);
    // Nếu errors khác rỗng thì chuyền Error qua bên file ejs
    if(!errors.isEmpty()){
        const params = {
            TableName: tablePaper,
            alert : errors.array()
        };
        docClient.scan(params, (err, data) => {
            if (err) {
                res.send(err)
            } else {
                // Chuyền các dữ liệu qua file index.ejs
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
// Xóa 1 dòng dữ liệu trong Table
app.post("/delete", convertToFormJson.fields([]), (req, res) => {
    // Lấy idPaper của dòng dữ liệu cần xóa
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