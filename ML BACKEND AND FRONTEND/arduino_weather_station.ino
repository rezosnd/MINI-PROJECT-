#include <Wire.h>
#include <Adafruit_Sensor.h>
#include <DHT.h>
#include <Adafruit_BMP280.h>
#include <BH1750.h>  // For UV sensor (BH1750 is light sensor, for UV you might need ML8511)

// Pin definitions
#define DHTPIN 2          // DHT22 data pin
#define DHTTYPE DHT22     // DHT22 sensor type
#define RAIN_SENSOR_PIN A0 // Rain sensor analog pin
#define UV_SENSOR_PIN A1   // UV sensor analog pin

// Initialize sensors
DHT dht(DHTPIN, DHTTYPE);
Adafruit_BMP280 bmp; // I2C
BH1750 lightMeter;   // I2C for light, but we'll use it as proxy for UV

void setup() {
  Serial.begin(9600);
  dht.begin();

  if (!bmp.begin(0x76)) {  // BMP280 I2C address
    Serial.println("Could not find BMP280 sensor!");
    while (1);
  }

  if (!lightMeter.begin()) {
    Serial.println("Could not find BH1750 sensor!");
  }

  // Configure BMP280
  bmp.setSampling(Adafruit_BMP280::MODE_NORMAL,
                  Adafruit_BMP280::SAMPLING_X2,
                  Adafruit_BMP280::SAMPLING_X16,
                  Adafruit_BMP280::FILTER_X16,
                  Adafruit_BMP280::STANDBY_MS_500);

  Serial.println("Weather Station Initialized");
}

void loop() {
  // Read temperature and humidity
  float temperature = dht.readTemperature();
  float humidity = dht.readHumidity();

  // Read pressure
  float pressure = bmp.readPressure() / 100.0F; // Convert to hPa

  // Read rain sensor (analog value 0-1023, convert to percentage)
  int rainAnalog = analogRead(RAIN_SENSOR_PIN);
  float precipitation = map(rainAnalog, 0, 1023, 100, 0); // Invert: dry=0%, wet=100%

  // Read UV sensor (analog value, convert to UV index)
  int uvAnalog = analogRead(UV_SENSOR_PIN);
  float uv_index = map(uvAnalog, 0, 1023, 0, 16); // UV index 0-16

  // Check if readings are valid
  if (isnan(temperature) || isnan(humidity) || isnan(pressure)) {
    Serial.println("Error reading sensors!");
    delay(2000);
    return;
  }

  // Send data in CSV format: temperature,humidity,precipitation,uv_index,pressure
  Serial.print(temperature, 2);
  Serial.print(",");
  Serial.print(humidity, 2);
  Serial.print(",");
  Serial.print(precipitation, 2);
  Serial.print(",");
  Serial.print(uv_index, 2);
  Serial.print(",");
  Serial.println(pressure, 2);

  // Wait 2 seconds before next reading
  delay(2000);
}