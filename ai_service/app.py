from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

app = Flask(__name__)
CORS(app)

# Hàm chuẩn hóa dữ liệu dùng chung (Chống lỗi thiếu cột, null)
def build_dataframe(all_products):
    df = pd.DataFrame(all_products)

    if df.empty or 'id' not in df.columns:
        return None

    # Ép kiểu an toàn cho 3 cột văn bản
    for col in ['name', 'description', 'categoryName']:
        if col not in df.columns:
            df[col] = ''
        df[col] = df[col].fillna('').astype(str)

    df['content'] = df['name'] + " " + df['description'] + " " + df['categoryName']
    return df

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.json
        current_id = data.get('current_id')
        all_products = data.get('all_products', [])

        if not current_id or not all_products:
            return jsonify([])

        df = build_dataframe(all_products)
        if df is None:
            return jsonify([])

        matched = df[df['id'] == current_id]
        if matched.empty:
            return jsonify([])

        tfidf = TfidfVectorizer()
        tfidf_matrix = tfidf.fit_transform(df['content'])
        cosine_sim = cosine_similarity(tfidf_matrix, tfidf_matrix)

        idx = matched.index[0]
        sim_scores = list(enumerate(cosine_sim[idx]))
        sim_scores = sorted(sim_scores, key=lambda x: x[1], reverse=True)
        
        # Lọc chính xác ID để không bao giờ gợi ý lại món đang xem
        sim_scores = [x for x in sim_scores if int(df.iloc[x[0]]['id']) != current_id][:4]

        recommended_ids = [int(df.iloc[i[0]]['id']) for i in sim_scores]
        return jsonify(recommended_ids)

    except Exception as e:
        print(f"Lỗi AI Tương tự: {e}")
        return jsonify([])

@app.route('/predict_foryou', methods=['POST'])
def predict_foryou():
    try:
        data = request.json
        # NHẬN MẢNG OBJECT CÓ CHỨA ĐIỂM (SCORE) TỪ C#
        history_prefs = data.get('history_prefs', []) 
        all_products = data.get('all_products', [])

        if not history_prefs or not all_products:
            return jsonify([])

        df = build_dataframe(all_products)
        if df is None:
            return jsonify([])

        tfidf = TfidfVectorizer()
        tfidf_matrix = tfidf.fit_transform(df['content'])
        cosine_sim = cosine_similarity(tfidf_matrix, tfidf_matrix)

        # Trích xuất ID và Map điểm số
        score_map = {item['id']: item['score'] for item in history_prefs}
        history_ids = list(score_map.keys())

        history_indices = df[df['id'].isin(history_ids)].index.tolist()
        if not history_indices:
            return jsonify([])

        vectors = []
        weights = []
        for idx in history_indices:
            prod_id = int(df.iloc[idx]['id'])
            vectors.append(cosine_sim[idx])
            weights.append(score_map[prod_id]) # Lấy điểm làm trọng số
            
        # Tính trung bình CÓ TRỌNG SỐ (Weighted Average) thay vì trung bình thường
        user_profile = np.average(vectors, axis=0, weights=weights)
        # -----------------------------------

        sim_scores = list(enumerate(user_profile))
        sim_scores = sorted(sim_scores, key=lambda x: x[1], reverse=True)

        recommended_ids = []
        history_set = set(history_ids)

        for i, score in sim_scores:
            prod_id = int(df.iloc[i]['id'])
            if prod_id not in history_set:
                recommended_ids.append(prod_id)
            if len(recommended_ids) >= 8:
                break

        return jsonify(recommended_ids)

    except Exception as e:
        print(f"Lỗi AI For You (Weighted): {e}")
        return jsonify([])

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)