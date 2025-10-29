document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const vinInput = document.getElementById('vin');
    const decodeBtn = document.getElementById('decodeBtn');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');
    const resultsContainer = document.getElementById('resultsContainer');
    const showResultsBtn = document.getElementById('showResults');
    const clearFiltersBtn = document.getElementById('clearFilters');
    const moreFiltersBtn = document.getElementById('moreFiltersBtn');

    // Filter Elements
    const yearMinSlider = document.getElementById('yearMin');
    const odometerSlider = document.getElementById('odometerSlider');
    const makeSelect = document.getElementById('make');
    const modelSelect = document.getElementById('model');
    const trimSelect = document.getElementById('trim');
    const provinceSelect = document.getElementById('province');
    const saleDateSelect = document.getElementById('saleDate');

    let decodedVinData = null;

    // VIN Input - Auto uppercase and filter
    vinInput.addEventListener('input', function() {
        this.value = this.value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '');
    });

    // Decode VIN Button
    decodeBtn.addEventListener('click', async function() {
        const vin = vinInput.value.trim();

        if (vin.length !== 17) {
            showError('VIN must be exactly 17 characters');
            return;
        }

        hideMessages();
        showLoading(true);

        try {
            const response = await fetch('/api/decode-vin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ vin: vin })
            });

            const data = await response.json();
            showLoading(false);

            if (data.success) {
                decodedVinData = data.data;
                populateFiltersFromVin(data.data);
                showSuccess('✓ VIN has been decoded into the filters below!');
            } else {
                showError(data.error || 'Failed to decode VIN');
            }
        } catch (error) {
            showLoading(false);
            console.error('Error:', error);
            showError('Network error: Unable to decode VIN');
        }
    });

    function populateFiltersFromVin(data) {
        // Set Year
        if (data.year) {
            const year = parseInt(data.year);
            yearMinSlider.value = year;
            document.getElementById('yearMinDisplay').textContent = year;
            document.getElementById('yearMaxDisplay').textContent = year;
        }

        // Set Make - try to match with existing options
        if (data.make) {
            // Try to find exact match
            let foundMatch = false;
            for (let i = 0; i < makeSelect.options.length; i++) {
                if (makeSelect.options[i].value.toLowerCase() === data.make.toLowerCase()) {
                    makeSelect.value = makeSelect.options[i].value;
                    foundMatch = true;
                    break;
                }
            }

            // If no match found, add the decoded value as a new option
            if (!foundMatch) {
                const option = document.createElement('option');
                option.value = data.make;
                option.textContent = data.make;
                makeSelect.appendChild(option);
                makeSelect.value = data.make;
            }
        }

        // Set Model - try to match with existing options
        if (data.model) {
            // Try to find exact match
            let foundMatch = false;
            for (let i = 0; i < modelSelect.options.length; i++) {
                if (modelSelect.options[i].value.toLowerCase() === data.model.toLowerCase()) {
                    modelSelect.value = modelSelect.options[i].value;
                    foundMatch = true;
                    break;
                }
            }

            // If no match found, add the decoded value as a new option
            if (!foundMatch) {
                const option = document.createElement('option');
                option.value = data.model;
                option.textContent = data.model;
                modelSelect.appendChild(option);
                modelSelect.value = data.model;
            }
        }

        // Set Trim - try to match with existing options
        if (data.series) {
            // Try to find exact match
            let foundMatch = false;
            for (let i = 0; i < trimSelect.options.length; i++) {
                if (trimSelect.options[i].value.toLowerCase() === data.series.toLowerCase()) {
                    trimSelect.value = trimSelect.options[i].value;
                    foundMatch = true;
                    break;
                }
            }

            // If no match found, add the decoded value as a new option
            if (!foundMatch) {
                const option = document.createElement('option');
                option.value = data.series;
                option.textContent = data.series;
                trimSelect.appendChild(option);
                trimSelect.value = data.series;
            }
        }
    }

    // Year Slider
    yearMinSlider.addEventListener('input', function() {
        document.getElementById('yearMinDisplay').textContent = this.value;
        document.getElementById('yearMaxDisplay').textContent = this.value;
    });

    // Odometer Slider
    odometerSlider.addEventListener('input', function() {
        document.getElementById('odometerMin').textContent = '0';
        document.getElementById('odometerMax').textContent = parseInt(this.value).toLocaleString();
    });

    // Show Results Button
    showResultsBtn.addEventListener('click', async function() {
        const vin = vinInput.value.trim();
        const mileage = parseInt(odometerSlider.value);

        if (vin.length !== 17) {
            showError('Please enter a valid 17-character VIN first and decode it');
            return;
        }

        if (isNaN(mileage) || mileage < 0) {
            showError('Please enter a valid odometer reading');
            return;
        }

        hideMessages();
        showLoading(true);

        try {
            const response = await fetch('/api/pricing-cards', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ vin: vin, mileage: mileage })
            });

            const data = await response.json();
            showLoading(false);

            if (data.cards && data.cards.length > 0) {
                displayResults(data.cards);
                showSuccess('Pricing data retrieved successfully!');
                resultsContainer.style.display = 'block';
                setTimeout(() => {
                    resultsContainer.scrollIntoView({ behavior: 'smooth' });
                }, 100);
            } else {
                showError(data.error || 'Failed to fetch pricing data');
            }
        } catch (error) {
            showLoading(false);
            console.error('Error:', error);
            showError('Network error: Unable to fetch data');
        }
    });

    // Clear Filters Button
    clearFiltersBtn.addEventListener('click', function() {
        vinInput.value = '';
        yearMinSlider.value = 2024;
        odometerSlider.value = 100000;
        makeSelect.value = '';
        modelSelect.value = '';
        trimSelect.value = '';
        provinceSelect.value = '';
        saleDateSelect.value = '90';
        document.getElementById('yearMinDisplay').textContent = '1980';
        document.getElementById('yearMaxDisplay').textContent = '2026';
        document.getElementById('odometerMin').textContent = '0';
        document.getElementById('odometerMax').textContent = '200000';
        resultsContainer.style.display = 'none';
        hideMessages();
    });

    // More Filters Button
    moreFiltersBtn.addEventListener('click', function() {
        alert('More filter options coming soon!');
    });

    function displayResults(cards) {
        const prices = cards.map(c => c.adjusted_whole_clean).filter(p => p);
        const kmValues = cards.map(c => c.mileage).filter(k => k);

        if (prices.length > 0) {
            document.getElementById('lowestPrice').textContent = '$' + Math.min(...prices).toLocaleString();
            document.getElementById('averagePrice').textContent = '$' + Math.round(prices.reduce((a, b) => a + b) / prices.length).toLocaleString();
            document.getElementById('highestPrice').textContent = '$' + Math.max(...prices).toLocaleString();
        }

        if (kmValues.length > 0) {
            document.getElementById('lowestKms').textContent = Math.min(...kmValues).toLocaleString() + ' km';
            document.getElementById('averageKms').textContent = Math.round(kmValues.reduce((a, b) => a + b) / kmValues.length).toLocaleString() + ' km';
            document.getElementById('highestKms').textContent = Math.max(...kmValues).toLocaleString() + ' km';
        }

        const ontarioPricingCardEl = document.getElementById('ontarioPricingCard');
        const quebecPricingCardEl = document.getElementById('quebecPricingCard');

        ontarioPricingCardEl.innerHTML = '';
        quebecPricingCardEl.innerHTML = '';

        const ontarioCard = cards.find(c => c.province === 'Ontario');
        const quebecCard = cards.find(c => c.province === 'Quebec');

        if (ontarioCard) {
            ontarioPricingCardEl.innerHTML = createCardHTML(ontarioCard);
        }
        if (quebecCard) {
            quebecPricingCardEl.innerHTML = createCardHTML(quebecCard);
        }
    }

    function createCardHTML(card) {
        const vehicleInfo = `${card.year} ${card.make} ${card.model}`;
        const wholesalePrice = card.adjusted_whole_clean || 0;

        return `
            <h3>${card.province} - Wholesale Pricing</h3>
            <div class="pricing-item">
                <div class="pricing-label">Vehicle</div>
                <div class="pricing-value">${vehicleInfo}</div>
            </div>
            <div class="pricing-item">
                <div class="pricing-label">VIN</div>
                <div class="pricing-value" style="font-size: 0.9rem; letter-spacing: 0.05em;">${card.vin}</div>
            </div>
            <div class="pricing-item">
                <div class="pricing-label">Mileage</div>
                <div class="pricing-value">${card.mileage.toLocaleString()}</div>
                <div class="pricing-subtitle">kilometers</div>
            </div>
            <div class="pricing-item" style="border-top: 2px solid rgba(255,255,255,0.4); padding-top: 20px; margin-top: 20px;">
                <div class="pricing-label">Wholesale Price (Clean)</div>
                <div class="pricing-value" style="font-size: 2.2rem;">$${wholesalePrice.toLocaleString('en-US', {maximumFractionDigits: 0})}</div>
            </div>
            <div class="pricing-item">
                <div class="pricing-label">Published</div>
                <div class="pricing-value" style="font-size: 0.95rem;">${card.publish_date || 'N/A'}</div>
            </div>
        `;
    }

    function showLoading(show) {
        loadingIndicator.style.display = show ? 'block' : 'none';
        showResultsBtn.disabled = show;
        decodeBtn.disabled = show;
    }

    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        successMessage.style.display = 'none';
    }

    function showSuccess(message) {
        successMessage.textContent = message;
        successMessage.style.display = 'block';
        errorMessage.style.display = 'none';
    }

    function hideMessages() {
        errorMessage.style.display = 'none';
        successMessage.style.display = 'none';
    }
});
