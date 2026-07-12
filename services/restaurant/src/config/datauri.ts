import DataUriParser from "datauri/parser";
import path from "path";

const getBuffer = (file: any) => { 
    const parser = new DataUriParser();
    const ext = path.extname(file.originalname).toString();

    return parser.format(ext, file.buffer);
}

export default getBuffer