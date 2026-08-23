# 1段階目：プログラムをビルドする部屋（重たい工具セット入り）
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build-env
# コンテナ内の作業フォルダを設定
WORKDIR /app

# .csproj を正しい場所からコピー
COPY MatoMemo/*.csproj ./MatoMemo/

# restore
RUN dotnet restore MatoMemo/*.csproj

# すべてのソースコードをコピーしてビルドを実行
COPY . ./
# 実行用に出力フォルダ（out）へコンパイル済みの部品を書き出す
RUN dotnet publish -c Release -o out

# 2段階目：プログラムを動かすためだけの軽量な部屋（実行環境のみ）
FROM mcr.microsoft.com/dotnet/aspnet:8.0
# コンテナ内の作業フォルダを設定
WORKDIR /app
# 1段階目の部屋から、コンパイルされた部品（outフォルダの中身）だけをピンポイントでコピー
COPY --from=build-env /app/out .

# コンテナ起動時に、ASP.NETのAPIプログラムを実行する
ENTRYPOINT ["dotnet", "MatoMemo.dll"]
