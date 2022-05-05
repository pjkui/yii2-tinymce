window.tinymceElfinder = function (opts) {
    // elFinder node
    let elfNode = $("<div/>");
    if (opts.nodeId) {
        elfNode.attr("id", opts.nodeId);
        delete opts.nodeId;
    }

    // upload target folder hash
    const uploadTargetHash = opts.uploadTargetHash || "L1_Lw";
    delete opts.uploadTargetHash;

    // get elFinder insrance
    const getfm = (open) => {
        // CSS class name of TinyMCE conntainer
        const cls = tinymce.majorVersion < 5 ? "mce-container" : "tox";
        return new Promise((resolve, reject) => {
            // elFinder instance
            let elf;

            // Execute when the elFinder instance is created
            const done = () => {
                if (open) {
                    // request to open folder specify
                    if (!Object.keys(elf.files()).length) {
                        // when initial request
                        elf.one("open", () => {
                            elf.file(open)
                                ? resolve(elf)
                                : reject(elf, "errFolderNotFound");
                        });
                    } else {
                        // elFinder has already been initialized
                        new Promise((res, rej) => {
                            if (elf.file(open)) {
                                res();
                            } else {
                                // To acquire target folder information
                                elf.request({ cmd: "parents", target: open })
                                    .done((e) => {
                                        // elf.request({cmd: 'tree', target: open}).done(e =>{
                                        elf.file(open) ? res() : rej();
                                    })
                                    .fail(() => {
                                        rej();
                                    });
                            }
                        })
                            .then(() => {
                                if (elf.cwd().hash == open) {
                                    resolve(elf);
                                } else {
                                    // Open folder after folder information is acquired
                                    elf.exec("open", open)
                                        .done(() => {
                                            resolve(elf);
                                        })
                                        .fail((err) => {
                                            reject(
                                                elf,
                                                err ? err : "errFolderNotFound"
                                            );
                                        });
                                }
                            })
                            .catch((err) => {
                                reject(elf, err ? err : "errFolderNotFound");
                            });
                    }
                } else {
                    // show elFinder manager only
                    resolve(elf);
                }
            };

            // Check elFinder instance
            if ((elf = elfNode.elfinder("instance"))) {
                // elFinder instance has already been created
                done();
            } else {
                // To create elFinder instance
                elf = elfNode
                    .dialogelfinder(
                        Object.assign(
                            {
                                // dialog title
                                title: "File Manager",
                                // start folder setting
                                startPathHash: open ? open : void 0,
                                // Set to do not use browser history to un-use location.hash
                                useBrowserHistory: false,
                                // Disable auto open
                                autoOpen: false,
                                // elFinder dialog width
                                width: "90%",
                                // elFinder dialog height
                                height: "90%",
                                // set getfile command options
                                commandsOptions: {
                                    getfile: {
                                        oncomplete: "close",
                                    },
                                },
                                bootCallback: (fm) => {
                                    // set z-index
                                    fm.getUI().css(
                                        "z-index",
                                        parseInt(
                                            $("body>." + cls + ":last").css(
                                                "z-index"
                                            )
                                        ) + 100
                                    );
                                },
                                getFileCallback: (files, fm) => { },
                            },
                            opts
                        )
                    )
                    .elfinder("instance");
                elf.bind("upload", function (event) {
                    elf.exec("reload");
                });
                done();
            }
        });
    };

    this.browser = function (callback, value, meta) {
        getfm().then((fm) => {
            let cgf = fm.getCommand("getfile");
            const regist = () => {
                fm.options.getFileCallback = cgf.callback = (file, fm) => {
                    var url, reg, info;

                    // URL normalization
                    // url = fm.convAbsUrl(file.url);
                    url = file.url;

                    // Make file info
                    info = file.name + " (" + fm.formatSize(file.size) + ")";

                    // Provide file and text for the link dialog
                    if (meta.filetype == "file") {
                        callback(url, { text: info, title: info });
                    }

                    // Provide image and alt text for the image dialog
                    if (meta.filetype == "image") {
                        callback(url, { alt: info });
                    }

                    // Provide alternative source and posted for the media dialog
                    if (meta.filetype == "media") {
                        callback(url);
                    }
                };
                fm.getUI().dialogelfinder("open");
            };
            if (cgf) {
                // elFinder booted
                regist();
            } else {
                // elFinder booting now
                fm.bind("init", () => {
                    cgf = fm.getCommand("getfile");
                    regist();
                });
            }
        });

        return false;
    };

    this.uploadHandler = function (blobInfo, success, failure) {
        new Promise(function (resolve, reject) {
            getfm(uploadTargetHash)
                .then((fm) => {
                    let fmNode = fm.getUI(),
                        file = blobInfo.blob(),
                        clipdata = true;
                    const err = (e) => {
                        var dlg = e.data.dialog || {};
                        if (
                            dlg.hasClass("elfinder-dialog-error") ||
                            dlg.hasClass("elfinder-confirm-upload")
                        ) {
                            fmNode.dialogelfinder("open");
                            fm.unbind("dialogopened", err);
                        }
                    },
                        closeDlg = () => {
                            if (
                                !fm
                                    .getUI()
                                    .find(
                                        ".elfinder-dialog-error:visible,.elfinder-confirm-upload:visible"
                                    ).length
                            ) {
                                fmNode.dialogelfinder("close");
                            }
                        };

                    // check file object
                    if (file.name) {
                        // file blob of client side file object
                        clipdata = void 0;
                    }
                    // Bind err function and exec upload
                    fm.bind("dialogopened", err)
                        .exec(
                            "upload",
                            {
                                files: [file],
                                target: uploadTargetHash,
                                clipdata: clipdata, // to get unique name on connector
                                dropEvt: { altKey: true, ctrlKey: true }, // diable watermark on demo site
                            },
                            void 0,
                            uploadTargetHash
                        )
                        .done((data) => {
                            if (data.added && data.added.length) {
                                fm.url(data.added[0].hash, { async: true })
                                    .done(function (url) {
                                        // prevent to use browser cache
                                        // url += (url.match(/\?/)? '&' : '?') + '_t=' + data.added[0].ts;
                                        resolve(fm.convAbsUrl(url));
                                        // resolve(url);
                                    })
                                    .fail(function () {
                                        reject(fm.i18n("errFileNotFound"));
                                    });
                            } else {
                                reject(
                                    fm.i18n(
                                        data.error ? data.error : "errUpload"
                                    )
                                );
                            }
                        })
                        .fail((err) => {
                            const error = fm.parseError(err);
                            reject(
                                fm.i18n(
                                    error
                                        ? error === "userabort"
                                            ? "errAbort"
                                            : error
                                        : "errUploadNoFiles"
                                )
                            );
                        })
                        .always(() => {
                            fm.unbind("dialogopened", err);
                            closeDlg();
                        });
                })
                .catch((fm, err) => {
                    const error = fm.parseError(err);
                    reject(
                        fm.i18n(
                            error
                                ? error === "userabort"
                                    ? "errAbort"
                                    : error
                                : "errUploadNoFiles"
                        )
                    );
                });
        })
            .then((url) => {
                success(url);
            })
            .catch((err) => {
                failure(err);
            });
    };

    this.uploadFile = function (blobInfo, success, failure, progress) {
        var xhr, formData;
        xhr = new XMLHttpRequest();
        xhr.withCredentials = true;
        xhr.open("POST", opts.url);

        xhr.upload.onprogress = function (e) {
            progress((e.loaded / e.total) * 100);
        };

        xhr.onload = function () {
            var json;
            if (xhr.status == 403) {
                failure("HTTP Error: " + xhr.status, { remove: true });
                return;
            }
            if (xhr.status < 200 || xhr.status >= 300) {
                failure("HTTP Error: " + xhr.status);
                return;
            }
            json = JSON.parse(xhr.responseText);
            if (!json || typeof json.location != "string") {
                failure("Invalid JSON: " + xhr.responseText);
                return;
            }
            success(json.location);
        };

        xhr.onerror = function () {
            failure(
                "Image upload failed due to a XHR Transport error. Code: " +
                xhr.status
            );
        };

        formData = new FormData();
        formData.append("file", blobInfo.blob(), blobInfo.filename());
        if (opts.customData != null) {
            for (const key in opts.customData) {
                if (Object.hasOwnProperty.call(opts.customData, key)) {
                    const val1 = opts.customData[key];
                    formData.append(key, val1);
                }
            }
        }

        xhr.send(formData);
    };
    this.filePicker = function (callback, value, meta) {
        //文件分类
        var filetype =
            ".pdf, .txt, .zip, .rar, .7z, .doc, .docx, .xls, .xlsx, .ppt, .pptx, .mp3, .mp4";
        //后端接收上传文件的地址
        var upurl = opts.url + "&type=image";
        //为不同插件指定文件类型及后端地址
        switch (meta.filetype) {
            case "image":
                filetype = ".jpg, .jpeg, .png, .gif";
                // upurl = "upimg.php";
                break;
            case "media":
                filetype = ".mp3, .mp4";
                // upurl = "upfile.php";
                upurl = opts.url + "&type=file";
                break;
            case "file":
                upurl = opts.url + "&type=file";
            default:
        }
        //模拟出一个input用于添加本地文件
        var input = document.createElement("input");
        input.setAttribute("type", "file");
        input.setAttribute("accept", filetype);
        input.click();
        input.onchange = function () {
            var file = this.files[0];

            var xhr, formData;
            console.log(file.name);
            xhr = new XMLHttpRequest();
            xhr.withCredentials = false;
            xhr.open("POST", upurl);
            xhr.onload = function () {
                var json;
                if (xhr.status != 200) {
                    callback("HTTP Error: " + xhr.status);
                    return;
                }
                json = JSON.parse(xhr.responseText);
                if (!json || typeof json.location != "string") {
                    callback("Invalid JSON: " + xhr.responseText);
                    return;
                }
                callback(json.location, { title: file.name });
            };
            formData = new FormData();
            formData.append("file", file, file.name);
            xhr.send(formData);

            //下方被注释掉的是官方的一个例子
            //放到下面给大家参考

            /*var reader = new FileReader();
            reader.onload = function () {
                // Note: Now we need to register the blob in TinyMCEs image blob
                // registry. In the next release this part hopefully won't be
                // necessary, as we are looking to handle it internally.
                var id = 'blobid' + (new Date()).getTime();
                var blobCache =  tinymce.activeEditor.editorUpload.blobCache;
                var base64 = reader.result.split(',')[1];
                var blobInfo = blobCache.create(id, file, base64);
                blobCache.add(blobInfo);

                // call the callback and populate the Title field with the file name
                callback(blobInfo.blobUri(), { title: file.name });
            };
            reader.readAsDataURL(file);*/
        };
    };
    this.pastePostAction = (editor, args) => {
        console.log("start uploading ...");
        setTimeout(()=>{
            tinymce.activeEditor.uploadImages(function(success) {
                console.log("upload end ",success);
                // document.forms[0].submit();
                  });
        },1500);
  
    };
};
