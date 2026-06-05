import os
import sys
import subprocess

# 1. Automatic dependency check and installation
def install_requirements():
    try:
        import qrcode
        from PIL import Image
    except ImportError:
        print("Required libraries ('qrcode', 'pillow') not found. Installing automatically...")
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", "qrcode[pil]"])
            print("Successfully installed libraries!")
        except Exception as e:
            print(f"Error installing dependencies: {e}")
            print("Please run manually: pip install qrcode pillow")
            sys.exit(1)

install_requirements()

import qrcode

# 2. Define data for QR codes
QR_DATA = {
    # KTM Student Cards
    "ktm_jahzeel.png": "KTM-245150300111002",
    "ktm_abdillah.png": "KTM-245150300111008",
    "ktm_ezra.png": "KTM-245150307111009",
    
    # Facilities
    "facility_game_corner.png": "FAC-f1",
    "facility_gkm_lt2.png": "FAC-f2",
    "facility_lapangan_basket.png": "FAC-f3"
}

def generate_qr_codes():
    output_dir = os.path.join(os.getcwd(), "qrcodes")
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        print(f"Created directory: {output_dir}")
        
    print("\nGenerating scannable QR Codes as PNGs...")
    
    for filename, data in QR_DATA.items():
        filepath = os.path.join(output_dir, filename)
        
        # Configure QR code generator
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=10,
            border=4,
        )
        qr.add_data(data)
        qr.make(fit=True)
        
        # Create and save image
        img = qr.make_image(fill_color="black", back_color="white")
        img.save(filepath)
        
        print(f" -> Generated: {filename} (Data: '{data}')")
        
    print(f"\nSuccess! All QR Code images are saved in: {output_dir}\n")

if __name__ == "__main__":
    generate_qr_codes()
