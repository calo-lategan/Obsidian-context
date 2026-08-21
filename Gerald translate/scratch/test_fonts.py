import fitz

doc = fitz.open()
page = doc.new_page()

# Let's try different font names and see which ones succeed without throwing an exception
test_fonts = [
    "helv", "helvetica", "helv-bold", "helv-b", "helv-i", "helv-bi",
    "times", "times-roman", "times-bold", "times-b", "times-i", "times-bi",
    "couri", "courier", "couri-bold", "couri-b",
    "Helvetica", "Helvetica-Bold", "Times-Roman", "Times-Bold"
]

for font in test_fonts:
    try:
        page.insert_text(fitz.Point(100, 100), "test", fontname=font)
        print(f"Success: {font}")
    except Exception as e:
        print(f"Failed: {font} - {e}")
