use napi_derive::napi;

#[napi]
pub fn extract_text_from_pdf(buffer: Vec<u8>) -> Result<String, napi::Error> {
    match pdf_extract::extract_text_from_mem(&buffer) {
        Ok(text) => Ok(text),
        Err(e) => Err(napi::Error::from_reason(format!("PDF extraction failed: {}", e))),
    }
}

#[napi]
pub fn extract_text_from_docx(buffer: Vec<u8>) -> Result<String, napi::Error> {
    match docx_rs::read_docx(&buffer) {
        Ok(docx) => {
            // Basic extraction: join all paragraph text
            // Note: docx-rs has a structured API, we'll simplify for now
            let mut full_text = String::new();
            for child in docx.document.children {
                if let docx_rs::DocumentChild::Paragraph(p) = child {
                    for child in p.children {
                        if let docx_rs::ParagraphChild::Run(r) = child {
                            for child in r.children {
                                if let docx_rs::RunChild::Text(t) = child {
                                    full_text.push_str(&t.text);
                                }
                            }
                        }
                    }
                    full_text.push('\n');
                }
            }
            Ok(full_text)
        }
        Err(e) => Err(napi::Error::from_reason(format!("DOCX extraction failed: {}", e))),
    }
}
