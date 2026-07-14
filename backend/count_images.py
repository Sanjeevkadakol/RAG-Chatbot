import glob
import os
import fitz  # PyMuPDF

DATASET_DIR = "../dataset"
pdf_files = glob.glob(os.path.join(DATASET_DIR, "*.pdf"))

total_images = 0
total_pages = 0

for file_path in pdf_files:
    try:
        pdf_document = fitz.open(file_path)
        total_pages += len(pdf_document)
        for page_num in range(len(pdf_document)):
            page = pdf_document.load_page(page_num)
            image_list = page.get_images(full=True)
            for img in image_list:
                # Approximate filtering for very small images as in main.py
                try:
                    xref = img[0]
                    base_image = pdf_document.extract_image(xref)
                    w = base_image.get("width", 0)
                    h = base_image.get("height", 0)
                    if w >= 150 and h >= 150:
                        total_images += 1
                except:
                    pass
    except Exception as e:
        print(f"Error reading {file_path}: {str(e)}")

print(f"Total PDFs: {len(pdf_files)}")
print(f"Total Pages: {total_pages}")
print(f"Total Eligible Images: {total_images}")
