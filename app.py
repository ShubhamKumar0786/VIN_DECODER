import os
import requests
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from blackbook_service import BlackbookService
from market_listings_service import MarketListingsService

load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SESSION_SECRET', os.urandom(24).hex())

CORS(app)

blackbook_service = BlackbookService()
market_listings_service = MarketListingsService()


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/admin')
def admin():
    return render_template('admin.html')


@app.route('/api/test-credentials', methods=['POST'])
def test_credentials():
    try:
        result = blackbook_service.test_credentials()
        status_code = 200 if result.get('success') else 400
        return jsonify(result), status_code
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Server error: {str(e)}'
        }), 500


@app.route('/api/fetch-vehicle', methods=['POST'])
def fetch_vehicle():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400
        
        vin = data.get('vin', '').strip()
        odometer = data.get('odometer')
        
        if not vin:
            return jsonify({
                'success': False,
                'error': 'VIN is required'
            }), 400
        
        if odometer is None:
            return jsonify({
                'success': False,
                'error': 'Odometer reading is required'
            }), 400
        
        try:
            odometer = int(odometer)
        except (ValueError, TypeError):
            return jsonify({
                'success': False,
                'error': 'Odometer must be a valid number'
            }), 400
        
        result = blackbook_service.fetch_vehicle_data(vin, odometer)
        status_code = 200 if result.get('success') else 400
        return jsonify(result), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Server error: {str(e)}'
        }), 500


@app.route('/api/pricing-cards', methods=['POST'])
def pricing_cards():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400
        
        vin = data.get('vin', '').strip()
        mileage = data.get('mileage')
        
        if not vin:
            return jsonify({
                'success': False,
                'error': 'VIN is required'
            }), 400
        
        if mileage is None:
            return jsonify({
                'success': False,
                'error': 'Mileage is required'
            }), 400
        
        try:
            mileage = int(mileage)
        except (ValueError, TypeError):
            return jsonify({
                'success': False,
                'error': 'Mileage must be a valid number'
            }), 400
        
        result = blackbook_service.fetch_pricing_cards(vin, mileage)
        
        if result.get('success'):
            return jsonify({'cards': result.get('cards')}), 200
        else:
            return jsonify(result), 400
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Server error: {str(e)}'
        }), 500


@app.route('/api/decode-vin', methods=['POST'])
def decode_vin():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400
        
        vin = data.get('vin', '').strip()
        
        if not vin:
            return jsonify({
                'success': False,
                'error': 'VIN is required'
            }), 400
        
        if len(vin) != 17:
            return jsonify({
                'success': False,
                'error': 'VIN must be 17 characters'
            }), 400
        
        nhtsa_url = f'https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/{vin}?format=json'
        
        response = requests.get(nhtsa_url, timeout=10)
        
        if response.status_code != 200:
            return jsonify({
                'success': False,
                'error': f'NHTSA API error: {response.status_code}'
            }), 400
        
        nhtsa_data = response.json()
        
        if 'Results' not in nhtsa_data:
            return jsonify({
                'success': False,
                'error': 'Invalid response from NHTSA'
            }), 400
        
        results = nhtsa_data['Results']
        
        def get_value(variable_name):
            for item in results:
                if item.get('Variable') == variable_name:
                    value = item.get('Value')
                    if value:
                        return str(value).strip() or None
            return None
        
        trim = get_value('Trim')
        trim2 = get_value('Trim2')
        series = get_value('Series')
        series2 = get_value('Series2')
        
        trim_parts = []
        if series:
            trim_parts.append(series)
        if series2 and series2 != series:
            trim_parts.append(series2)
        if trim:
            trim_parts.append(trim)
        if trim2 and trim2 != trim:
            trim_parts.append(trim2)
        
        full_trim = ' '.join(trim_parts) if trim_parts else None
        
        vehicle_info = {
            'vin': vin,
            'make': get_value('Make'),
            'model': get_value('Model'),
            'year': get_value('Model Year'),
            'trim': full_trim or trim or series,
            'trim_level': trim,
            'series': series,
            'body_class': get_value('Body Class'),
            'engine': get_value('Engine Model') or get_value('Displacement (L)'),
            'engine_config': get_value('Engine Configuration'),
            'cylinders': get_value('Engine Number of Cylinders'),
            'displacement': get_value('Displacement (L)'),
            'transmission': get_value('Transmission Style'),
            'transmission_speeds': get_value('Transmission Speeds'),
            'drive_type': get_value('Drive Type'),
            'fuel_type': get_value('Fuel Type - Primary'),
            'manufacturer': get_value('Manufacturer Name'),
            'plant': get_value('Plant City') or get_value('Plant Country'),
            'vehicle_type': get_value('Vehicle Type'),
            'doors': get_value('Doors'),
            'windows': get_value('Windows'),
            'seat_rows': get_value('Seat Rows')
        }
        
        vehicle_info = {k: v for k, v in vehicle_info.items() if v}
        
        return jsonify({
            'success': True,
            'vehicle_info': vehicle_info
        }), 200
        
    except requests.Timeout:
        return jsonify({
            'success': False,
            'error': 'NHTSA API timeout'
        }), 504
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Server error: {str(e)}'
        }), 500


@app.route('/api/market-listings', methods=['POST'])
def market_listings():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400
        
        year = data.get('year')
        make = data.get('make')
        model = data.get('model')
        province = data.get('province')
        blackbook_retail = data.get('blackbook_retail', 0)
        
        if not all([year, make, model]):
            return jsonify({
                'success': False,
                'error': 'Year, make, and model are required'
            }), 400
        
        try:
            year = int(year)
        except (ValueError, TypeError):
            return jsonify({
                'success': False,
                'error': 'Year must be a valid number'
            }), 400
        
        listings = market_listings_service.search_listings(
            year=year,
            make=make,
            model=model,
            province=province,
            max_results=15
        )
        
        for listing in listings:
            if blackbook_retail > 0:
                listing['price_vs_blackbook'] = listing.get('price', 0) - blackbook_retail
            else:
                listing['price_vs_blackbook'] = None
        
        return jsonify({
            'success': True,
            'listings': listings,
            'blackbook_retail': blackbook_retail,
            'count': len(listings)
        }), 200
        
    except Exception as e:
        app.logger.error(f'Market listings error: {str(e)}')
        return jsonify({
            'success': False,
            'error': f'Error fetching market listings: {str(e)}'
        }), 500


@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'service': 'Blackbook GraphQL Fetcher'
    }), 200


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=os.getenv('FLASK_ENV') == 'development')
