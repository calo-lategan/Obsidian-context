import fitz

def translate_0_5mm(input_path, output_path):
    doc = fitz.open(input_path)
    page = doc[0]
    
    # Redaction list: (rect, replacement_text, font_size, font_style, alignment)
    redactions = [
        # Redact the Chinese company name "扬子江新型材料（苏州）有限公司" at the top left
        # We replace it with blank, since the English name is already underneath
        (fitz.Rect(45.6, 60.0, 305.0, 85.0), "", 0, "helv", fitz.TEXT_ALIGN_LEFT),
        
        # Redact the Chinese address "苏州市相城区黄埭镇潘阳工业园春丰路88号" at the top right
        # We replace it with blank, since the English address is already underneath
        (fitz.Rect(650.0, 60.0, 892.0, 85.0), "", 0, "helv", fitz.TEXT_ALIGN_LEFT),
        
        # Document Title "产品质量证明书"
        # We redact both "产品质量证明书" and "INSPECTION CERTIFICATE" and write a clean centered title
        (fitz.Rect(300.0, 48.0, 545.0, 110.0), "INSPECTION CERTIFICATE", 20, "Times-Bold", fitz.TEXT_ALIGN_CENTER),
        
        # Row 1 Cells
        # Cell 1 (Label): "客户名称" / "SOLD TO"
        (fitz.Rect(50.4, 140.0, 181.8, 181.0), "CUSTOMER NAME\n(SOLD TO)", 9, "Helvetica-Bold", fitz.TEXT_ALIGN_CENTER),
        # Cell 1 (Value): "昇迅活动房（上海）有限公司"
        (fitz.Rect(181.8, 140.0, 338.0, 181.0), "Shengxun Mobile House (Shanghai) Co., Ltd.", 9, "helv", fitz.TEXT_ALIGN_CENTER),
        # Cell 2 (Label): "产品名称" / "PRODUCT"
        (fitz.Rect(338.0, 140.0, 426.0, 181.0), "PRODUCT NAME\n(PRODUCT)", 9, "Helvetica-Bold", fitz.TEXT_ALIGN_CENTER),
        
        # Row 2 Cells
        # Cell 3 (Label): "订单号码" / "ORDER NO"
        (fitz.Rect(50.4, 181.0, 181.8, 222.0), "ORDER NO.", 9, "Helvetica-Bold", fitz.TEXT_ALIGN_CENTER),
        # Cell 4 (Label): "基板型号" / "PRODUCED BY"
        (fitz.Rect(338.0, 181.0, 426.0, 222.0), "SUBSTRATE GRADE\n(PRODUCED BY)", 8.5, "Helvetica-Bold", fitz.TEXT_ALIGN_CENTER),
        
        # Row 3 Cells
        # Cell 5 (Label): "规格" / "SIZE"
        (fitz.Rect(50.4, 222.0, 181.8, 263.0), "SPECIFICATION\n(SIZE)", 9, "Helvetica-Bold", fitz.TEXT_ALIGN_CENTER),
        # Cell 6 (Label): "颜色（面/背）" / "COLOR"
        (fitz.Rect(338.0, 222.0, 426.0, 263.0), "COLOR\n(TOP / BACK)", 9, "Helvetica-Bold", fitz.TEXT_ALIGN_CENTER),
        # Cell 6 (Value): "江南白/灰白" -> "Jiangnan White / Off-White"
        (fitz.Rect(426.0, 222.0, 586.0, 263.0), "Jiangnan White /\nOff-White", 9, "helv", fitz.TEXT_ALIGN_CENTER),
        # Cell 7 (Label): "生产日期" / "DATE"
        (fitz.Rect(586.0, 222.0, 684.0, 263.0), "MANUFACTURE DATE\n(DATE)", 8.5, "Helvetica-Bold", fitz.TEXT_ALIGN_CENTER),
        
        # Table Grid Headers (Row 1)
        # Column 1: "序号" -> "No."
        (fitz.Rect(50.4, 263.0, 75.6, 326.0), "No.", 9, "Helvetica-Bold", fitz.TEXT_ALIGN_CENTER),
        # Column 2: "钢卷编号" / "COIL NO." -> "Coil No."
        (fitz.Rect(75.6, 263.0, 181.8, 326.0), "Coil No.", 9.5, "Helvetica-Bold", fitz.TEXT_ALIGN_CENTER),
        # Column 3: "净重(T)" / "NET WEIGHT" -> "Net Wt. (T)"
        (fitz.Rect(181.8, 263.0, 231.0, 326.0), "Net Wt.\n(T)", 9, "Helvetica-Bold", fitz.TEXT_ALIGN_CENTER),
        # Column 4: "长度(m)" / "LENGTH" -> "Length (m)"
        (fitz.Rect(231.0, 263.0, 280.2, 326.0), "Length\n(m)", 9, "Helvetica-Bold", fitz.TEXT_ALIGN_CENTER),
        # Column 5: "化学成份CHEMICAL COMPOSITION WT%"
        (fitz.Rect(280.2, 263.0, 491.0, 282.0), "Chemical Composition (wt%)", 9, "Helvetica-Bold", fitz.TEXT_ALIGN_CENTER),
        # Column 6: "涂层性能指标COATING PROPERTY"
        (fitz.Rect(491.0, 263.0, 792.0, 282.0), "Coating Properties", 9, "Helvetica-Bold", fitz.TEXT_ALIGN_CENTER),
        
        # Chemical sub-headers (Row 2)
        (fitz.Rect(280.2, 282.0, 322.0, 326.0), "C\nx10^-2", 8, "helv", fitz.TEXT_ALIGN_CENTER),
        (fitz.Rect(322.0, 282.0, 363.0, 326.0), "Mn\nx10^-2", 8, "helv", fitz.TEXT_ALIGN_CENTER),
        (fitz.Rect(363.0, 282.0, 404.0, 326.0), "Si\nx10^-2", 8, "helv", fitz.TEXT_ALIGN_CENTER),
        (fitz.Rect(404.0, 282.0, 445.0, 326.0), "P\nx10^-3", 8, "helv", fitz.TEXT_ALIGN_CENTER),
        (fitz.Rect(445.0, 282.0, 491.0, 326.0), "S\nx10^-3", 8, "helv", fitz.TEXT_ALIGN_CENTER),
        
        # Coating sub-headers (Row 2) - replace Greek mu with 'u' to avoid rendering as '?'
        (fitz.Rect(491.0, 282.0, 538.0, 326.0), "Coating\nThickness\n(um)", 7.5, "helv", fitz.TEXT_ALIGN_CENTER),
        (fitz.Rect(538.0, 282.0, 580.0, 326.0), "60°\nGloss", 8, "helv", fitz.TEXT_ALIGN_CENTER),
        (fitz.Rect(580.0, 282.0, 622.0, 326.0), "Pencil\nHardness", 7.5, "helv", fitz.TEXT_ALIGN_CENTER),
        (fitz.Rect(622.0, 282.0, 664.0, 326.0), "T-bend", 8, "helv", fitz.TEXT_ALIGN_CENTER),
        (fitz.Rect(664.0, 282.0, 712.0, 326.0), "Adhesion\nTest", 7.5, "helv", fitz.TEXT_ALIGN_CENTER),
        (fitz.Rect(712.0, 282.0, 756.0, 326.0), "Impact\nTest (J)", 7.5, "helv", fitz.TEXT_ALIGN_CENTER),
        (fitz.Rect(756.0, 282.0, 792.0, 326.0), "MEK\n(cycles)", 8, "helv", fitz.TEXT_ALIGN_CENTER),
        
        # Bottom "Confirm" / "质检章"
        (fitz.Rect(626.0, 526.0, 730.0, 555.0), "Confirm", 10, "Helvetica-Bold", fitz.TEXT_ALIGN_CENTER),
    ]
    
    # Apply all redactions first
    for rect, text, size, font, align in redactions:
        page.add_redact_annot(rect, fill=(1, 1, 1))
    
    page.apply_redactions()
    
    # Insert new text
    for rect, text, size, font, align in redactions:
        if not text:
            continue
            
        # Map simple font names
        font_name = "helv"
        if font == "Times-Bold":
            font_name = "Times-Bold"
        elif font == "Times-Roman":
            font_name = "Times-Roman"
        elif font == "Helvetica-Bold":
            font_name = "Helvetica-Bold"
        
        page.insert_textbox(
            rect,
            text,
            fontsize=size,
            fontname=font_name,
            align=align,
            color=(0, 0, 0)
        )
        
    doc.save(output_path)
    print(f"Successfully saved translated 0.5mm PDF to {output_path}")

translate_0_5mm("0.5mm.pdf", "0.5mm_EN.pdf")
