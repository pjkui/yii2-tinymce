<?php

namespace pjkui\Yii2Tinymce;

class Asset extends \yii\web\AssetBundle
{
    public $sourcePath = '@vendor/tinymce/tinymce';

    public $js = [
        'tinymce.min.js',
    ];
}
